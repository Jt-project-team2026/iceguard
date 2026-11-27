from django.conf import settings
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .authentication import HasApiKey, IsAdminPassword
from .exceptions import ApiError
from .models import Device, Event, Reading
from .serializers import EventsQuerySerializer, HistoryQuerySerializer, ReadingInputSerializer
from .services import (
    device_to_dict,
    downsample,
    event_to_dict,
    now_ms,
    reading_to_dict,
    record_reading,
)


def _get_device_or_404(device_id: str) -> Device:
    try:
        return Device.objects.get(device_id=device_id)
    except Device.DoesNotExist:
        raise ApiError("UNKNOWN_DEVICE", f"등록되지 않은 장치입니다: {device_id}", 404)


class AdminView(APIView):
    """관리자 비밀번호가 필요한 뷰의 부모 클래스.

    인증 실패도 요청 횟수에 포함해야 비밀번호 무차별 대입을 막을 수 있어서,
    DRF 기본 순서(권한 → 제한)와 달리 제한을 먼저 검사한다.
    """

    permission_classes = [IsAdminPassword]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "admin"

    def check_permissions(self, request):
        APIView.check_throttles(self, request)
        super().check_permissions(request)

    def check_throttles(self, request):
        pass  # check_permissions에서 이미 검사함


class ReadingCreateView(APIView):
    """POST /api/readings — ESP32 측정값 업로드"""

    permission_classes = [HasApiKey]

    def post(self, request):
        serializer = ReadingInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        device = _get_device_or_404(data["device_id"])
        reading, events = record_reading(device, data)
        return Response(
            {"ok": True, "data": {"ts": reading.ts, "events": [event.type for event in events]}},
            status=201,
        )


class DeviceListView(APIView):
    """GET /api/devices — 장치 목록 + 최신값 + 온라인 여부 (공개)"""

    def get(self, request):
        devices = Device.objects.order_by("id")
        return Response({"ok": True, "data": [device_to_dict(d) for d in devices]})


class HistoryView(AdminView):
    """GET /api/history?device_id&minutes — 온도·습도 추이"""

    def get(self, request):
        query = HistoryQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        device = _get_device_or_404(query.validated_data["device_id"])
        since = now_ms() - query.validated_data["minutes"] * 60_000

        rows = list(Reading.objects.filter(device=device, ts__gte=since).order_by("ts", "id"))
        rows = downsample(rows, settings.HISTORY_MAX_POINTS)
        return Response({"ok": True, "data": [reading_to_dict(r) for r in rows]})


class EventListView(AdminView):
    """GET /api/events?device_id&limit — 이벤트 기록 (최신순)"""

    def get(self, request):
        query = EventsQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        events = Event.objects.select_related("device").order_by("-ts", "-id")
        device_id = query.validated_data.get("device_id")
        if device_id:
            events = events.filter(device=_get_device_or_404(device_id))
        events = events[: query.validated_data["limit"]]
        return Response({"ok": True, "data": [event_to_dict(e) for e in events]})


class HealthView(APIView):
    """GET /api/health — 서버 깨우기 / 상태 확인"""

    def get(self, request):
        return Response({"ok": True, "data": {"status": "up", "ts": now_ms()}})
