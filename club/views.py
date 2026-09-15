"""الصفحات وواجهة الـ AJAX."""
import csv
import json
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from .models import ClubSettings, Payment, Player, month_label
from .services import (
    build_month_payload,
    normalize_month,
    player_history,
    revenue_trend,
    to_num,
)


# ---------------------------------------------------------------- أدوات مساعدة

def _body(request) -> dict:
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        return {}


def _decimal(value, default=None):
    if value in (None, "", "null"):
        return default
    try:
        number = Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError):
        return default
    return number.quantize(Decimal("0.01"))


def _current_month(request):
    now = timezone.localtime()
    year = request.GET.get("year") or now.year
    month = request.GET.get("month") or now.month
    try:
        return normalize_month(year, month)
    except (TypeError, ValueError):
        return now.year, now.month


def _error(message, status=400):
    return JsonResponse({"ok": False, "error": message}, status=status)


# ------------------------------------------------------------------- الصفحات

@login_required
def app_view(request):
    now = timezone.localtime()
    return render(
        request,
        "app.html",
        {
            "club_name": ClubSettings.load().club_name,
            "year": now.year,
            "month": now.month,
        },
    )


@login_required
def settings_view(request):
    now = timezone.localtime()
    return render(
        request,
        "settings.html",
        {"club_name": ClubSettings.load().club_name, "year": now.year, "month": now.month},
    )


@login_required
def report_view(request):
    year, month = _current_month(request)
    payload = build_month_payload(year, month, include_payments=False)
    players = sorted(payload["players"], key=lambda p: (p["group"], p["name"]))
    return render(
        request,
        "report.html",
        {
            "payload": payload,
            "players": players,
            "juniors": [p for p in players if p["group"] == "juniors"],
            "seniors": [p for p in players if p["group"] == "seniors"],
            "printed_at": timezone.localtime().strftime("%d/%m/%Y %H:%M"),
        },
    )


@login_required
def export_csv(request):
    year, month = _current_month(request)
    payload = build_month_payload(year, month, include_payments=False)

    response = HttpResponse(content_type="text/csv; charset=utf-8-sig")
    filename = f"kungfu-{year}-{month:02d}.csv"
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response.write("\ufeff")

    writer = csv.writer(response)
    writer.writerow(["الاسم", "المجموعة", "الموبايل", "الاشتراك", "الخصم", "المطلوب", "المدفوع", "المتبقي"])
    for p in payload["players"]:
        writer.writerow([
            p["name"], p["group_label"], p["phone"],
            p["fee"], p["discount"], p["due"], p["paid"], p["remaining"],
        ])
    t = payload["totals"]
    writer.writerow([])
    writer.writerow(["الإجمالي", "", "", "", "", t["due"], t["paid"], t["remaining"]])
    return response


# --------------------------------------------------------------------- الـ API

@login_required
def api_data(request):
    year, month = _current_month(request)
    payload = build_month_payload(year, month)
    payload["trend"] = revenue_trend(year, month)
    payload["ok"] = True
    return JsonResponse(payload)


@login_required
@require_POST
def api_player_create(request):
    data = _body(request)
    name = (data.get("name") or "").strip()
    if not name:
        return _error("اكتب اسم اللاعب")

    group = data.get("group")
    if group not in dict(Player.GROUP_CHOICES):
        group = Player.JUNIORS

    player = Player.objects.create(
        name=name,
        group=group,
        phone=(data.get("phone") or "").strip(),
        custom_monthly_fee=_decimal(data.get("custom_monthly_fee")),
        discount=_decimal(data.get("discount"), Decimal("0")) or Decimal("0"),
        note=(data.get("note") or "").strip(),
    )
    return JsonResponse({"ok": True, "id": player.id, "message": f"{player.name} اتضاف"})


@login_required
@require_POST
def api_player_update(request, player_id):
    player = get_object_or_404(Player, pk=player_id)
    data = _body(request)

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return _error("اسم اللاعب مينفعش يبقى فاضي")
        player.name = name
    if data.get("group") in dict(Player.GROUP_CHOICES):
        player.group = data["group"]
    if "phone" in data:
        player.phone = (data.get("phone") or "").strip()
    if "note" in data:
        player.note = (data.get("note") or "").strip()
    if "discount" in data:
        value = _decimal(data.get("discount"), Decimal("0")) or Decimal("0")
        player.discount = max(value, Decimal("0"))
    if "custom_monthly_fee" in data:
        value = _decimal(data.get("custom_monthly_fee"))
        player.custom_monthly_fee = None if (value is None or value <= 0) else value
    if "is_active" in data:
        player.is_active = bool(data["is_active"])

    player.save()
    return JsonResponse({"ok": True, "message": "البيانات اتحدّثت"})


@login_required
@require_POST
def api_player_delete(request, player_id):
    player = get_object_or_404(Player, pk=player_id)
    name = player.name
    player.delete()
    return JsonResponse({"ok": True, "message": f"{name} اتشال"})


@login_required
def api_player_history(request, player_id):
    player = get_object_or_404(Player, pk=player_id)
    return JsonResponse({"ok": True, "history": player_history(player)})


@login_required
@require_POST
def api_pay(request, player_id):
    player = get_object_or_404(Player, pk=player_id)
    data = _body(request)
    settings = ClubSettings.load()

    try:
        year, month = normalize_month(
            data.get("year") or timezone.localtime().year,
            data.get("month") or timezone.localtime().month,
        )
    except (TypeError, ValueError):
        return _error("الشهر غير صحيح")

    kind = data.get("kind") if data.get("kind") in dict(Payment.KIND_CHOICES) else Payment.CUSTOM
    method = data.get("method") if data.get("method") in dict(Payment.METHOD_CHOICES) else Payment.CASH

    amount = _decimal(data.get("amount"))
    if amount is None:
        # "سداد الباقي": السيرفر هو اللي يحسب المتبقي
        from .services import month_payments_map

        paid = month_payments_map(year, month).get(player.id, Decimal("0"))
        amount = player.due(settings) - paid
        kind = Payment.MONTH

    if amount is None or amount <= 0:
        return _error("المبلغ لازم يكون أكبر من صفر")

    payment = Payment.objects.create(
        player=player,
        amount=amount,
        year=year,
        month=month,
        kind=kind,
        method=method,
        note=(data.get("note") or "").strip(),
    )
    return JsonResponse({
        "ok": True,
        "payment_id": payment.id,
        "message": f"اتسجل {to_num(amount)} {settings.currency} لـ {player.name}",
    })


@login_required
@require_POST
def api_payment_delete(request, payment_id):
    payment = get_object_or_404(Payment, pk=payment_id)
    payment.delete()
    return JsonResponse({"ok": True, "message": "الدفعة اتحذفت"})


@login_required
@require_POST
def api_settings_update(request):
    data = _body(request)
    settings = ClubSettings.load()

    name = (data.get("club_name") or "").strip()
    if name:
        settings.club_name = name

    monthly = _decimal(data.get("monthly_fee"))
    session = _decimal(data.get("session_fee"))
    if monthly is None or monthly < 0 or session is None or session < 0:
        return _error("اكتب أرقام صحيحة للاشتراك والحصة")

    settings.monthly_fee = monthly
    settings.session_fee = session
    currency = (data.get("currency") or "").strip()
    if currency:
        settings.currency = currency
    settings.save()
    return JsonResponse({"ok": True, "message": "الإعدادات اتحفظت"})


@login_required
@require_POST
def api_bulk_pay(request):
    """تسجيل حصة لمجموعة لاعبين مرة واحدة (تحضير اليوم)."""
    data = _body(request)
    ids = data.get("player_ids") or []
    if not isinstance(ids, list) or not ids:
        return _error("اختار لاعبين الأول")

    settings = ClubSettings.load()
    year, month = normalize_month(
        data.get("year") or timezone.localtime().year,
        data.get("month") or timezone.localtime().month,
    )
    amount = _decimal(data.get("amount"), settings.session_fee) or settings.session_fee
    if amount <= 0:
        return _error("المبلغ لازم يكون أكبر من صفر")

    players = Player.objects.filter(pk__in=ids, is_active=True)
    Payment.objects.bulk_create([
        Payment(
            player=p, amount=amount, year=year, month=month,
            kind=Payment.SESSION, method=Payment.CASH, note="حضور",
            paid_at=datetime.now(tz=timezone.get_current_timezone()),
        )
        for p in players
    ])
    return JsonResponse({
        "ok": True,
        "message": f"اتسجلت حصة لـ {players.count()} لاعب",
    })


@login_required
def api_month_label(request):
    year, month = _current_month(request)
    return JsonResponse({"ok": True, "label": month_label(year, month)})
