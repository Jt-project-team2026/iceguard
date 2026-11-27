from rest_framework import serializers

from .models import HeaterMode, HeaterState, Level


class ReadingInputSerializer(serializers.Serializer):
    device_id = serializers.CharField(max_length=50)
    temp = serializers.FloatField(min_value=-40, max_value=85)  # DHT22 측정 범위
    hum = serializers.FloatField(min_value=0, max_value=100)
    level = serializers.ChoiceField(choices=Level.values)
    heater = serializers.BooleanField()
    state = serializers.ChoiceField(choices=HeaterState.values)
    mat_temp = serializers.FloatField(min_value=-40, max_value=150, required=False, allow_null=True)


class HistoryQuerySerializer(serializers.Serializer):
    device_id = serializers.CharField(max_length=50)
    minutes = serializers.IntegerField(min_value=1, max_value=1440, default=30)


class EventsQuerySerializer(serializers.Serializer):
    device_id = serializers.CharField(max_length=50, required=False)
    limit = serializers.IntegerField(min_value=1, max_value=200, default=50)


class CommandInputSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=HeaterMode.values)
    # 강제 모드가 유지되는 시간. AUTO 에서는 무시한다. (서버가 죽어도 열선이 계속 켜져 있지 않도록 항상 상한을 둔다)
    duration_sec = serializers.IntegerField(min_value=10, max_value=600, default=60)
