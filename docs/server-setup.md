# 서버 로컬 실행 (Windows PowerShell 기준)

```powershell
cd C:\iceguard\server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

copy .env.example .env        # 열어서 SECRET_KEY, API_KEY, ADMIN_PASSWORD 를 직접 정하세요
python manage.py migrate
python manage.py seed_device --device-id iceguard-01 --name "정문 오르막" --lat 37.0 --lng 127.0
python manage.py runserver
```

- 서버 주소: http://localhost:8000 (상태 확인: `/api/health`, 장치 목록: `/api/devices`)
- Django 관리자: http://localhost:8000/django-admin/ (먼저 `python manage.py createsuperuser`)
- 등록되지 않은 `device_id` 의 업로드는 404 `UNKNOWN_DEVICE` 로 거부됩니다. 장치는 `seed_device` 로 등록합니다.

## 테스트

```powershell
python manage.py test
```

## 시뮬레이터 (ESP32 없이 화면 확인)

서버를 켠 상태에서 다른 터미널로 실행합니다. `--api-key` 는 `.env` 의 `API_KEY` 와 같아야 합니다.

```powershell
python scripts\simulate.py --api-key <API_KEY>                    # 결빙 시나리오
python scripts\simulate.py --api-key <API_KEY> --scenario fault   # 센서 오류 포함
python scripts\simulate.py --api-key <API_KEY> --scenario normal  # 항상 안전
python scripts\simulate.py --url https://<배포 주소> --api-key <API_KEY> --duration 120
```

시뮬레이터의 열선 상태머신은 `docs/state-machine.md` 규칙과 같고, 펌웨어 구현의 기준으로 씁니다.

## 요청 횟수 제한

관리자 API(`/api/history`, `/api/events`)는 IP당 분당 120회로 제한됩니다. 비밀번호를 틀린 요청도 횟수에 포함되어 무차별 대입을 막습니다.
