from django.urls import path

from . import views

urlpatterns = [
    path("readings", views.ReadingCreateView.as_view()),
    path("devices", views.DeviceListView.as_view()),
    path("history", views.HistoryView.as_view()),
    path("events", views.EventListView.as_view()),
    path("health", views.HealthView.as_view()),
]
