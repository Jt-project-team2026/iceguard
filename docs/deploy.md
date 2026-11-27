# 배포 가이드 (Render + Vercel)

| 구성 | 서비스 | 비고 |
|---|---|---|
| 서버 + DB | Render (Web Service + PostgreSQL, 무료) | `render.yaml` 로 한 번에 생성 |
| 프론트 | Vercel (Hobby, 무료) | `client/` 폴더를 배포 |
| 지도 | Kakao Developers (JavaScript 키) | 키가 없어도 간이 지도로 동작 |

> 프론트(Vercel)는 조직(org) 레포가 아니라 **개인 레포 `yoonjay06/iceguard`** 에서 배포합니다. (Vercel Hobby 는 조직 소유 비공개 레포 연동에 제한이 있어서, 개인 레포가 가장 단순합니다.)

## 무료 플랜 특징 (발표 전에 꼭 읽기)

- Render 무료 웹 서비스는 **15분간 요청이 없으면 잠들고**, 다음 요청 때 깨어나는 데 **약 1분** 걸립니다. 장치가 5초마다 데이터를 보내는 동안에는 깨어 있습니다.
- Render 무료 PostgreSQL 은 **생성 후 30일이 지나면 만료**됩니다. (14일 유예 후 삭제) 12/6 마감까지는 충분하지만, 그 뒤에도 쓸 거면 새로 만들어야 합니다.
- 무료 PostgreSQL 은 워크스페이스당 1개만 만들 수 있습니다.
- **발표 10분 전**에 `https://<서버주소>/api/health` 를 브라우저로 열어 서버를 깨워두세요.

## 0. 사전 준비

1. 로컬 변경을 모두 push 합니다. (`render.yaml` 이 기본 브랜치에 있어야 Render 가 읽습니다)
   ```powershell
   cd C:\iceguard
   git push
   ```
2. 아래 두 값을 미리 정해 메모해 두세요. (채팅·git 에 올리지 마세요)
   - `API_KEY`: ESP32 가 서버에 데이터를 올릴 때 쓰는 키. 길고 무작위로 (예: 24자 이상)
   - `ADMIN_PASSWORD`: 관리자 페이지 비밀번호

## 1. Render 가입 + 서버 배포

1. https://render.com → **Get Started** → **GitHub 로 가입** (개인 계정 `yoonjay06`)
2. 처음 접속하면 워크스페이스(이름 자유)를 만듭니다.
3. 대시보드 → **New +** → **Blueprint**
4. GitHub 연결 허용 화면이 나오면 **`yoonjay06/iceguard` 레포만** 선택해서 허용합니다.
5. 레포 선택 → 브랜치 `main` → `render.yaml` 을 읽어 `iceguard-api`(웹)와 `iceguard-db`(DB)가 보입니다.
6. 값 입력 칸에 `API_KEY`, `ADMIN_PASSWORD` 를 입력하고 **Apply / Deploy**.
7. 첫 빌드는 몇 분 걸립니다. `Live` 가 뜨면 서버 주소(예: `https://iceguard-api.onrender.com`)를 확인합니다. 이름이 이미 쓰이고 있으면 뒤에 무작위 글자가 붙습니다.
8. 확인: 브라우저에서 `https://<서버주소>/api/health` → `{"ok":true,...}`, `/api/devices` → 장치 `iceguard-01` 이 보여야 합니다.

시연 장치 이름·좌표는 Render 서비스 → **Environment** 의 `DEVICE_NAME`, `DEVICE_LAT`, `DEVICE_LNG` 를 고치고 저장하면 재배포되면서 반영됩니다. (무료 플랜은 서버 Shell 을 쓸 수 없어 빌드 때 자동 등록하도록 했습니다.)

## 2. 배포된 서버 시험 (시뮬레이터)

ESP32 없이 서버·화면을 먼저 확인할 수 있습니다.
```powershell
cd C:\iceguard\server
python scripts\simulate.py --url https://<서버주소> --api-key <API_KEY> --duration 70 --interval 3
```
첫 요청은 서버가 깨어나는 동안 실패할 수 있습니다. (`전송 실패` 후 계속 시도)

## 3. Vercel 가입 + 프론트 배포

1. https://vercel.com → **Sign Up** → 플랜 **Hobby** 선택 → **Continue with GitHub** (개인 계정)
2. **Add New… → Project** → `yoonjay06/iceguard` **Import** (안 보이면 *Adjust GitHub App Permissions* 에서 레포 허용)
3. 설정 화면에서:
   - **Root Directory**: `client` 로 변경 (Edit 버튼)
   - **Framework Preset**: Vite (자동 인식)
   - **Environment Variables** 추가
     - `VITE_API_BASE_URL` = `https://<Render 서버주소>` (끝에 `/` 없이)
     - `VITE_SHOW_MOCK` = `true` (시연용 예시 핀. 실제 장치만 보이게 하려면 `false`)
     - `VITE_KAKAO_JS_KEY` = (4단계에서 발급 후 추가. 지금은 비워도 됨)
4. **Deploy**. 완료되면 `https://<프로젝트>.vercel.app` 주소가 나옵니다.

> `VITE_` 환경변수는 **빌드 때 코드에 박힙니다.** 값을 바꾸면 Vercel → Deployments → 최신 배포 → **Redeploy** 해야 반영됩니다.

## 4. 서버가 프론트를 허용하도록 CORS 설정

Render → `iceguard-api` → **Environment** → `CORS_ALLOWED_ORIGINS` 를 Vercel 주소로 바꿉니다.
```
https://<프로젝트>.vercel.app
```
- 끝에 `/` 와 경로를 붙이지 않습니다. 여러 개는 쉼표로 구분 (예: `https://a.vercel.app,http://localhost:5173`).
- 저장하면 자동 재배포됩니다. 이후 Vercel 주소로 접속해서 "서버에 연결하지 못했어요" 가 사라지는지 확인합니다.

## 5. 카카오맵 연결

1. https://developers.kakao.com → 카카오 계정 로그인 → **내 애플리케이션 → 애플리케이션 추가** (앱 이름 예: IceGuard)
2. 앱 설정에서 **카카오맵 사용 설정 ON** (화면 이름이 바뀌었을 수 있으니 "카카오맵" 항목을 찾으세요)
3. **JavaScript 키**를 복사합니다.
4. **JavaScript SDK 도메인**(플랫폼 > Web)에 다음을 등록합니다. 프로토콜·포트까지 정확히:
   - `https://<프로젝트>.vercel.app`
   - `http://localhost:5173` (로컬 개발용)
5. Vercel 의 `VITE_KAKAO_JS_KEY` 에 키를 넣고 **Redeploy**.
6. 지도가 안 뜨면 브라우저 개발자도구 콘솔을 확인합니다. 도메인 미등록이면 에러가 납니다. (키가 있어도 로드에 실패하면 간이 지도로 자동 전환됩니다.)

## 6. ESP32 연결

`firmware/iceguard/config.h` (자세한 내용은 [firmware-setup.md](firmware-setup.md))
```c
#define SERVER_URL "https://<Render 서버주소>"
#define API_KEY    "<Render 에 넣은 API_KEY>"
#define DEVICE_ID  "iceguard-01"
```
시리얼 모니터에 `[net] 전송 OK (201)` 이 보이면 연결된 것입니다.

## 7. 배포 후 점검 체크리스트

- [ ] `/api/health` 응답
- [ ] 시뮬레이터 전송 후 Vercel 사용자 페이지(`/`)에 실시간 핀이 뜸
- [ ] `/admin` 에 잘못된 비밀번호 → 오류 메시지, 올바른 비밀번호 → 대시보드
- [ ] 카카오 지도에 핀이 정확한 위치로 뜸 (좌표 확인)
- [ ] 휴대폰(LTE)에서 Vercel 주소 접속
- [ ] 발표 10분 전 서버 깨우기

## 자주 막히는 곳

| 증상 | 원인 / 해결 |
|---|---|
| 화면에 "서버에 연결하지 못했어요" | `CORS_ALLOWED_ORIGINS` 불일치, 또는 `VITE_API_BASE_URL` 오타. 변경 후 각각 재배포 |
| 첫 접속이 1분 가까이 걸림 | Render 무료 서버가 깨어나는 중 (정상) |
| Render 빌드 실패 | 서비스 → Logs 의 마지막 오류 확인. Root Directory 가 `server` 인지 확인 |
| `/admin` 이 계속 401 | Render 의 `ADMIN_PASSWORD` 와 입력값 불일치 (앞뒤 공백 주의) |
| ESP32 로그 401/404 | `API_KEY` 불일치 / `DEVICE_ID` 가 서버에 등록된 값(`DEVICE_ID` 환경변수)과 다름 |
| Vercel 새로고침 시 404 | `client/vercel.json` 의 SPA rewrite 가 있어야 함 (이미 포함) |
