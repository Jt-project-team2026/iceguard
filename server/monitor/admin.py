from django.contrib import admin

from .models import Device, Event, Reading


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("device_id", "name", "lat", "lng", "created_at")
    search_fields = ("device_id", "name")


@admin.register(Reading)
class ReadingAdmin(admin.ModelAdmin):
    list_display = ("device", "ts", "temp", "hum", "level", "state", "heater", "mat_temp")
    list_filter = ("device", "level", "state")


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("device", "ts", "type", "detail")
    list_filter = ("device", "type")
