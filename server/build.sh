#!/usr/bin/env bash
# Render 빌드 명령: bash build.sh
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# 장치 등록 (Render 무료 플랜은 Shell 을 쓸 수 없어서 빌드 때 자동 등록/갱신한다)
# DEVICE_ID 가 설정돼 있을 때만 실행. 이름/좌표를 바꾸려면 환경변수를 수정하고 다시 배포.
if [ -n "${DEVICE_ID:-}" ]; then
  python manage.py seed_device --device-id "$DEVICE_ID" --name "${DEVICE_NAME:-IceGuard}" \
    --lat "${DEVICE_LAT:-0}" --lng "${DEVICE_LNG:-0}"
fi
