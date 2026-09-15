from django.contrib import admin

from .models import ClubSettings, Payment, Player


@admin.register(ClubSettings)
class ClubSettingsAdmin(admin.ModelAdmin):
    list_display = ("club_name", "monthly_fee", "session_fee", "currency")


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ("name", "group", "phone", "custom_monthly_fee", "discount", "is_active")
    list_filter = ("group", "is_active")
    search_fields = ("name", "phone")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("player", "amount", "year", "month", "kind", "method", "paid_at")
    list_filter = ("year", "month", "kind", "method")
    search_fields = ("player__name",)
    autocomplete_fields = ("player",)
