from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

urlpatterns = [
    # الصفحات
    path("", views.app_view, name="app"),
    path("settings/", views.settings_view, name="settings"),
    path("report/", views.report_view, name="report"),
    path("export/", views.export_csv, name="export"),
    path("login/", auth_views.LoginView.as_view(template_name="login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),

    # الـ API
    path("api/data/", views.api_data, name="api_data"),
    path("api/settings/", views.api_settings_update, name="api_settings"),
    path("api/players/create/", views.api_player_create, name="api_player_create"),
    path("api/players/<int:player_id>/update/", views.api_player_update, name="api_player_update"),
    path("api/players/<int:player_id>/delete/", views.api_player_delete, name="api_player_delete"),
    path("api/players/<int:player_id>/pay/", views.api_pay, name="api_pay"),
    path("api/players/<int:player_id>/history/", views.api_player_history, name="api_history"),
    path("api/payments/<int:payment_id>/delete/", views.api_payment_delete, name="api_payment_delete"),
    path("api/bulk-pay/", views.api_bulk_pay, name="api_bulk_pay"),
]
