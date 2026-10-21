# JUST MOVE 2.0

운동을 꾸준히 하지 못하는 사람에게 **"지금 1분만 움직이기"** 를 제안하는 웹앱입니다.
하루를 쉬어도 실패로 여기지 않고, 다시 돌아온 행동을 환영합니다.

- 서비스 기획 (기획서 원문 부록 포함): [docs/service-plan.md](docs/service-plan.md)
- 화면별 상세 명세: [docs/service-spec.md](docs/service-spec.md)
- 디자인 명세: [docs/design-spec.md](docs/design-spec.md)
- 기획서 항목별 추적표: [docs/requirements-trace.md](docs/requirements-trace.md)
- 수정 전 코드 진단: [docs/legacy-code-review.md](docs/legacy-code-review.md)

## 실행 방법

Node.js 20 이상이 필요합니다.

```bash
npm install --legacy-peer-deps
npm run web        # 개발 서버 (http://localhost:8081)
npm run typecheck  # 타입 검사
npm test           # 규칙 단위 테스트
npm run build:web  # 배포용 웹 빌드 (dist/)
```

## 웹 배포 (GitHub Pages)

`main`에 올리면 GitHub Actions(`.github/workflows/deploy-pages.yml`)가 웹으로 빌드해서 Pages에 배포합니다.

- 처음 한 번: 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿉니다.
  ("Deploy from a branch"로 두면 빌드 전 원본 파일이 올라가 README만 보입니다.)
- 주소: `https://아이디.github.io/저장소이름/` — 하위 경로는 저장소 이름으로 자동 설정됩니다(`WEB_BASE_PATH`).
- 진행 상황은 저장소의 **Actions** 탭에서 확인합니다.

## 현재 구현 (로컬 단계)

서버·외부 계정 없이 한 기기 안에서 모두 동작합니다. 데이터는 브라우저 저장소에 저장됩니다.

| 영역 | 내용 |
|---|---|
| 운동 시작 | 자세(누워서/앉아서/서서/걸으며) → 시간(1·3·5분) 선택 즉시 영상 시작 |
| 영상 | 1분 영상 연속 재생, 이전/다음/그만하기, 실제 재생 시간 측정, 중간 저장·이어서 하기, 화면 꺼짐 방지 |
| 기록 | 인정 시간(1·3·5분 단위 내림), 체감 난이도(선택), 월간 캘린더, 주간 그래프 |
| 재방문 | 하루 이상 쉬고 돌아오면 홈보다 먼저 환영 화면 (쉰 날 수·연속 기록 미표시) |
| 농장 | 물방울(1분당 1개, 하루 최대 5개) → 7개로 방울토마토 수확, 바구니, 팁 카드 |
| 알림 | 앱이 열려 있는 동안 정각 안내(1시간 뒤/3시간 뒤/오늘은 그만) |
| 계정 | 모의 로그인 (실제 카카오·구글 연결은 베타 단계) |

베타 단계에서 붙일 것: 서버·DB 저장, 카카오·구글 로그인과 기록 이전, 웹 푸시, 구글 스프레드시트 자동 반영, 관리자 지표 대시보드.

## 운동 영상 넣는 법

`public/videos/` 폴더에 1분 MP4 파일을 넣으면 됩니다.
파일 이름 규칙과 새 동작 추가 방법은 [public/videos/README.md](public/videos/README.md)를 참고하세요.
파일이 없으면 "임시 재생 모드"로 동작합니다.

## 운영 콘텐츠 수정

`data/content/` 의 JSON 파일을 수정합니다.

| 파일 | 내용 |
|---|---|
| `exercises.json` | 운동 목록 (이름, 자세, 부위, 차 안 가능 여부, 영상, 첫 동작) |
| `messages.json` | 환영 문구, 알림 문구, 오늘의 한마디 |
| `tips.json` | 수확 시 열리는 레시피·건강 팁 카드 |
| `config.json` | 익힌 동작 기준 횟수, 새 운동 비율, 하루 물방울 한도, 수확에 필요한 물방울 수 등 |

## 프로젝트 구조

```text
app/          화면 (Expo Router)
components/   공통 화면 구성요소
data/         콘텐츠(JSON)와 데이터 접근 계층(repository)
lib/          규칙 로직 (인정 시간, 추천, 농장, 환영, 지표) + 테스트
store/        앱 상태
hooks/        공통 훅
public/       정적 파일 (운동 영상)
docs/         서비스 기획 문서
```

## 기술 구성

TypeScript · React Native + Expo(Expo Router) · React Native Web · AsyncStorage · Vitest

## 주의사항

JUST MOVE의 운동 추천은 일반적인 생활체육 콘텐츠이며 의료 진단이나 치료를 대신하지 않습니다.
통증이나 질환이 있는 사용자는 운동 전 전문가와 상담해야 합니다.

## 기획

- Project: JUST MOVE
- Founder & Planner: 심재경
