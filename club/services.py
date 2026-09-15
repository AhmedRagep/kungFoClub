"""حسابات الاشتراكات والإجماليات."""
from decimal import Decimal

from django.db.models import Sum

from .models import ClubSettings, Payment, Player, month_label


def to_num(value) -> float:
    """تحويل Decimal لرقم عادي عشان يتبعت في JSON."""
    return float(Decimal(value or 0).quantize(Decimal("0.01")))


def normalize_month(year, month):
    """يظبط الشهر لو خرج عن 1..12 (مثلاً 13 يبقى يناير السنة اللي بعدها)."""
    year, month = int(year), int(month)
    year += (month - 1) // 12
    month = (month - 1) % 12 + 1
    return year, month


def month_payments_map(year: int, month: int):
    """مجموع المدفوع لكل لاعب في شهر معيّن — استعلام واحد."""
    rows = (
        Payment.objects.filter(year=year, month=month)
        .values("player_id")
        .annotate(total=Sum("amount"))
    )
    return {row["player_id"]: row["total"] or Decimal("0") for row in rows}


def serialize_payment(payment: Payment) -> dict:
    return {
        "id": payment.id,
        "amount": to_num(payment.amount),
        "kind": payment.kind,
        "kind_label": payment.get_kind_display(),
        "method": payment.method,
        "method_label": payment.get_method_display(),
        "note": payment.note,
        "date": payment.paid_at.strftime("%d/%m/%Y"),
        "time": payment.paid_at.strftime("%H:%M"),
    }


def serialize_player(player: Player, settings: ClubSettings, paid: Decimal, payments=None) -> dict:
    due = player.due(settings)
    paid = Decimal(paid or 0)
    remaining = due - paid
    progress = 100 if due <= 0 else min(100, round(float(paid) / float(due) * 100))
    return {
        "id": player.id,
        "name": player.name,
        "group": player.group,
        "group_label": player.get_group_display(),
        "phone": player.phone,
        "note": player.note,
        "is_active": player.is_active,
        "fee": to_num(player.fee(settings)),
        "custom_monthly_fee": to_num(player.custom_monthly_fee)
        if player.custom_monthly_fee is not None
        else None,
        "discount": to_num(player.discount),
        "due": to_num(due),
        "paid": to_num(paid),
        "remaining": to_num(remaining),
        "settled": remaining <= 0,
        "progress": progress,
        "payments": [serialize_payment(p) for p in (payments or [])],
    }


def totals_of(players: list) -> dict:
    due = sum(p["due"] for p in players)
    paid = sum(p["paid"] for p in players)
    return {
        "count": len(players),
        "due": round(due, 2),
        "paid": round(paid, 2),
        "remaining": round(due - paid, 2),
        "progress": 100 if due <= 0 else min(100, round(paid / due * 100)),
    }


def build_month_payload(year: int, month: int, include_payments: bool = True) -> dict:
    """كل بيانات الشهر: اللاعبين + الإجماليات + الإعدادات."""
    settings = ClubSettings.load()
    players = list(Player.objects.filter(is_active=True))
    paid_map = month_payments_map(year, month)

    payments_map = {}
    if include_payments:
        for payment in Payment.objects.filter(year=year, month=month).select_related("player"):
            payments_map.setdefault(payment.player_id, []).append(payment)

    data = [
        serialize_player(p, settings, paid_map.get(p.id, Decimal("0")), payments_map.get(p.id, []))
        for p in players
    ]

    juniors = [p for p in data if p["group"] == Player.JUNIORS]
    seniors = [p for p in data if p["group"] == Player.SENIORS]

    return {
        "settings": {
            "club_name": settings.club_name,
            "monthly_fee": to_num(settings.monthly_fee),
            "session_fee": to_num(settings.session_fee),
            "currency": settings.currency,
        },
        "month": {"year": year, "month": month, "label": month_label(year, month)},
        "players": data,
        "totals": totals_of(data),
        "groups": {
            "juniors": {"label": "الصغار", **totals_of(juniors)},
            "seniors": {"label": "الكبار", **totals_of(seniors)},
        },
    }


def player_history(player: Player, limit: int = 12) -> list:
    """إجمالي المدفوع لكل شهر سابق."""
    rows = (
        player.payments.values("year", "month")
        .annotate(total=Sum("amount"))
        .order_by("-year", "-month")[:limit]
    )
    return [
        {
            "year": r["year"],
            "month": r["month"],
            "label": month_label(r["year"], r["month"]),
            "total": to_num(r["total"]),
        }
        for r in rows
    ]


def revenue_trend(year: int, month: int, months: int = 6) -> list:
    """تحصيل آخر عدة شهور للرسم البياني."""
    result = []
    for offset in range(months - 1, -1, -1):
        y, m = normalize_month(year, month - offset)
        total = Payment.objects.filter(year=y, month=m).aggregate(t=Sum("amount"))["t"]
        result.append(
            {"year": y, "month": m, "label": month_label(y, m), "total": to_num(total)}
        )
    return result
