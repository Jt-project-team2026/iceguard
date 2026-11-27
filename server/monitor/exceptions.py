"""모든 오류 응답을 {ok:false, error, message} 형식으로 통일한다."""
from django.http import Http404
from rest_framework import exceptions as drf
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class ApiError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status


def error_body(code: str, message: str) -> dict:
    return {"ok": False, "error": code, "message": message}


def _flatten(detail) -> str:
    if isinstance(detail, dict):
        return "; ".join(f"{key}: {_flatten(value)}" for key, value in detail.items())
    if isinstance(detail, (list, tuple)):
        return ", ".join(_flatten(value) for value in detail)
    return str(detail)


def api_exception_handler(exc, context):
    if isinstance(exc, ApiError):
        return Response(error_body(exc.code, exc.message), status=exc.status_code)
    if isinstance(exc, Http404):
        return Response(error_body("NOT_FOUND", "요청한 항목을 찾을 수 없습니다."), status=404)

    response = drf_exception_handler(exc, context)
    if response is None:
        return None  # 예상 못한 오류는 handler500이 JSON으로 응답

    if isinstance(exc, drf.ValidationError):
        code, message = "INVALID_INPUT", _flatten(exc.detail)
    elif isinstance(exc, drf.ParseError):
        code, message = "INVALID_JSON", "JSON 형식이 올바르지 않습니다."
    elif isinstance(exc, drf.Throttled):
        wait = f" {int(exc.wait)}초 후 다시 시도하세요." if exc.wait else ""
        code, message = "TOO_MANY_REQUESTS", "요청이 너무 많습니다." + wait
    elif isinstance(exc, (drf.NotAuthenticated, drf.AuthenticationFailed)):
        code, message = "UNAUTHORIZED", "인증이 필요합니다."
    elif isinstance(exc, drf.MethodNotAllowed):
        code, message = "METHOD_NOT_ALLOWED", "허용되지 않는 요청 방식입니다."
    elif isinstance(exc, drf.NotFound):
        code, message = "NOT_FOUND", "요청한 항목을 찾을 수 없습니다."
    elif isinstance(exc, drf.UnsupportedMediaType):
        code, message = "UNSUPPORTED_MEDIA_TYPE", "Content-Type은 application/json 이어야 합니다."
    else:
        code, message = str(getattr(exc, "default_code", "ERROR")).upper(), _flatten(exc.detail)

    response.data = error_body(code, message)
    return response
