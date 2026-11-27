from django.db import models


class Level(models.TextChoices):
    SAFE = "안전", "안전"
    CAUTION = "주의", "주의"
    DANGER = "위험", "위험"


class HeaterState(models.TextChoices):
    OFF = "OFF", "대기"
    HEATING = "HEATING", "작동 중"
    COOLDOWN = "COOLDOWN", "휴식"
    FAULT = "FAULT", "오류"


class EventType(models.TextChoices):
    HEATER_ON = "HEATER_ON", "열선 켜짐"
    HEATER_OFF = "HEATER_OFF", "열선 꺼짐"
    COOLDOWN = "COOLDOWN", "휴식"
    FAULT = "FAULT", "오류"
    RECOVERED = "RECOVERED", "복구"


class Device(models.Model):
    device_id = models.SlugField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    lat = models.FloatField(default=0.0)
    lng = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.device_id})"


class Reading(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="readings")
    ts = models.BigIntegerField(help_text="서버 수신 시각 (epoch ms)")
    temp = models.FloatField()
    hum = models.FloatField()
    level = models.CharField(max_length=10, choices=Level.choices)
    heater = models.BooleanField()
    state = models.CharField(max_length=10, choices=HeaterState.choices)
    mat_temp = models.FloatField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["device", "-ts"])]
        ordering = ["-ts", "-id"]

    def __str__(self) -> str:
        return f"{self.device_id} {self.ts} {self.level}/{self.state}"


class Event(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="events")
    ts = models.BigIntegerField()
    type = models.CharField(max_length=12, choices=EventType.choices)
    detail = models.CharField(max_length=200, blank=True)

    class Meta:
        indexes = [models.Index(fields=["-ts"]), models.Index(fields=["device", "-ts"])]
        ordering = ["-ts", "-id"]

    def __str__(self) -> str:
        return f"{self.device_id} {self.type} {self.ts}"
