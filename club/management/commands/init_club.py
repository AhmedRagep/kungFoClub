"""أمر واحد يجهّز قاعدة البيانات وحساب الدخول: python manage.py init_club"""
import random
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from club.models import ClubSettings, Payment, Player

DEMO_NAMES = [
    ("يوسف محمود", "juniors"), ("مالك أحمد", "juniors"), ("حمزة سامي", "juniors"),
    ("عمر خالد", "juniors"), ("لين إبراهيم", "juniors"), ("جنى مصطفى", "juniors"),
    ("كريم عاطف", "seniors"), ("أحمد رضا", "seniors"), ("محمد السيد", "seniors"),
    ("زياد فتحي", "seniors"), ("مروان هشام", "seniors"),
]


class Command(BaseCommand):
    help = "يجهّز الإعدادات وحساب الأدمن، ويقدر يضيف بيانات تجريبية"

    def add_arguments(self, parser):
        parser.add_argument("--demo", action="store_true", help="إضافة لاعبين ودفعات تجريبية")
        parser.add_argument("--user", default="admin")
        parser.add_argument("--password", default="admin12345")

    def handle(self, *args, **options):
        settings = ClubSettings.load()
        self.stdout.write(self.style.SUCCESS(f"الإعدادات جاهزة: {settings.club_name}"))

        User = get_user_model()
        username = options["user"]
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username=username, password=options["password"])
            self.stdout.write(self.style.SUCCESS(
                f"اتعمل حساب دخول — المستخدم: {username} / كلمة السر: {options['password']}"
            ))
        else:
            self.stdout.write("حساب الدخول موجود بالفعل.")

        if options["demo"]:
            if Player.objects.exists():
                self.stdout.write("فيه لاعبين بالفعل، مش هضيف بيانات تجريبية.")
                return
            now = timezone.localtime()
            for name, group in DEMO_NAMES:
                player = Player.objects.create(
                    name=name,
                    group=group,
                    phone=f"01{random.randint(0, 2)}{random.randint(10000000, 99999999)}",
                    discount=Decimal("50") if random.random() < 0.2 else Decimal("0"),
                )
                for _ in range(random.randint(0, 4)):
                    Payment.objects.create(
                        player=player,
                        amount=Decimal("20"),
                        year=now.year,
                        month=now.month,
                        kind=Payment.SESSION,
                        note="حصة",
                    )
            self.stdout.write(self.style.SUCCESS(f"اتضاف {len(DEMO_NAMES)} لاعب تجريبي."))

        self.stdout.write(self.style.SUCCESS("تمام. شغّل: python manage.py runserver"))
