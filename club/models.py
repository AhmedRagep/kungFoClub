"""نماذج قاعدة البيانات: الإعدادات، اللاعبين، الدفعات."""
from decimal import Decimal

from django.db import models
from django.utils import timezone

ARABIC_MONTHS = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
]


def month_label(year: int, month: int) -> str:
    return f"{ARABIC_MONTHS[month - 1]} {year}"


class ClubSettings(models.Model):
    """إعدادات النادي — صف واحد فقط."""

    club_name = models.CharField("اسم النادي", max_length=100, default="نادي الكونغ فو")
    monthly_fee = models.DecimalField(
        "اشتراك الشهر", max_digits=10, decimal_places=2, default=Decimal("200")
    )
    session_fee = models.DecimalField(
        "سعر الحصة", max_digits=10, decimal_places=2, default=Decimal("20")
    )
    currency = models.CharField("العملة", max_length=10, default="ج.م")

    class Meta:
        verbose_name = "إعدادات النادي"
        verbose_name_plural = "إعدادات النادي"

    def __str__(self):
        return self.club_name

    @classmethod
    def load(cls) -> "ClubSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)


class Player(models.Model):
    JUNIORS = "juniors"
    SENIORS = "seniors"
    GROUP_CHOICES = [(JUNIORS, "الصغار"), (SENIORS, "الكبار")]

    name = models.CharField("الاسم", max_length=120)
    group = models.CharField("المجموعة", max_length=10, choices=GROUP_CHOICES, default=JUNIORS)
    phone = models.CharField("الموبايل", max_length=25, blank=True)
    custom_monthly_fee = models.DecimalField(
        "اشتراك خاص", max_digits=10, decimal_places=2, null=True, blank=True
    )
    discount = models.DecimalField(
        "خصم شهري", max_digits=10, decimal_places=2, default=Decimal("0")
    )
    is_active = models.BooleanField("نشط", default=True)
    note = models.CharField("ملاحظات", max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "لاعب"
        verbose_name_plural = "اللاعبون"
        ordering = ["name"]
        indexes = [models.Index(fields=["group"]), models.Index(fields=["is_active"])]

    def __str__(self):
        return self.name

    def fee(self, settings: ClubSettings) -> Decimal:
        """الاشتراك الشهري قبل الخصم."""
        if self.custom_monthly_fee is not None:
            return self.custom_monthly_fee
        return settings.monthly_fee

    def due(self, settings: ClubSettings) -> Decimal:
        """المطلوب بعد الخصم."""
        value = self.fee(settings) - self.discount
        return value if value > 0 else Decimal("0")


class Payment(models.Model):
    CASH = "cash"
    INSTAPAY = "instapay"
    WALLET = "wallet"
    OTHER = "other"
    METHOD_CHOICES = [
        (CASH, "كاش"),
        (INSTAPAY, "إنستاباي"),
        (WALLET, "محفظة"),
        (OTHER, "أخرى"),
    ]

    SESSION = "session"
    MONTH = "month"
    CUSTOM = "custom"
    KIND_CHOICES = [(SESSION, "حصة"), (MONTH, "شهر"), (CUSTOM, "دفعة")]

    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField("المبلغ", max_digits=10, decimal_places=2)
    year = models.PositiveIntegerField("السنة")
    month = models.PositiveSmallIntegerField("الشهر")
    kind = models.CharField("النوع", max_length=10, choices=KIND_CHOICES, default=CUSTOM)
    method = models.CharField("طريقة الدفع", max_length=10, choices=METHOD_CHOICES, default=CASH)
    note = models.CharField("ملاحظة", max_length=200, blank=True)
    paid_at = models.DateTimeField("تاريخ الدفع", default=timezone.now)

    class Meta:
        verbose_name = "دفعة"
        verbose_name_plural = "الدفعات"
        ordering = ["-paid_at"]
        indexes = [
            models.Index(fields=["year", "month"]),
            models.Index(fields=["player", "year", "month"]),
        ]

    def __str__(self):
        return f"{self.player.name} — {self.amount}"

    @property
    def month_label(self) -> str:
        return month_label(self.year, self.month)
