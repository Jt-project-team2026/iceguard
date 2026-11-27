"""API 키(ESP32)와 관리자 비밀번호 검사. 상수 시간 비교로 타이밍 공격을 막는다."""
import hmac

from django.conf import settings
from rest_framework.permissions import BasePermission

from .exceptions import ApiError


def _matches(provided: str | None, expected: str) -> bool:
    if not provided or not expected:  # 서버에 값이 설정되지 않았으면 모두 거부
        return False
    return hmac.compare_digest(provided.encode("utf-8"), expected.encode("utf-8"))


class HasApiKey(BasePermission):
    def has_permission(self, request, view):
        if not _matches(request.headers.get("x-api-key"), settings.API_KEY):
            raise ApiError("UNAUTHORIZED", "API 키가 올바르지 않습니다.", 401)
        return True


class IsAdminPassword(BasePermission):
    def has_permission(self, request, view):
        if not _matches(request.headers.get("x-admin-password"), settings.ADMIN_PASSWORD):
            raise ApiError("UNAUTHORIZED", "관리자 비밀번호가 올바르지 않습니다.", 401)
        return True
