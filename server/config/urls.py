from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include("monitor.urls")),
]


def _json_404(request, exception=None):
    return JsonResponse(
        {"ok": False, "error": "NOT_FOUND", "message": "요청한 경로를 찾을 수 없습니다."}, status=404
    )


def _json_500(request):
    return JsonResponse(
        {"ok": False, "error": "SERVER_ERROR", "message": "서버 내부 오류가 발생했습니다."}, status=500
    )


handler404 = _json_404
handler500 = _json_500
