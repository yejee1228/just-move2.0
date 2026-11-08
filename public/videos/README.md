# 운동 영상 폴더

이 폴더에 운동 영상(MP4, 1분 이상)을 넣으면 앱에서 바로 재생됩니다.

## 파일 이름 규칙
`data/content/exercises.json`의 `video` 값과 같은 이름으로 저장하세요.

| 자세 | 파일 이름 |
|---|---|
| 누워서 | `lying-01.mp4` ~ `lying-05.mp4` |
| 앉아서 | `sitting-01.mp4` ~ `sitting-05.mp4` |
| 서서 | `standing-01.mp4` ~ `standing-05.mp4` |
| 걸으며 | `walking-01.mp4` ~ `walking-05.mp4` |

동작 이름과 파일의 대응은 `data/content/exercises.json`에서 확인할 수 있습니다.

## 규격
- 길이: 1분 이상 (구령과 시범 포함). 영상마다 길이가 달라도 됩니다.
  - 재생할 때는 파일의 실제 길이로 남은 시간과 '끝까지 봤는지'를 계산합니다.
  - 바둑판 카드에 길이를 보여 주려면 `exercises.json`에 `"durationSec": 90`처럼 초 단위로 적어 주세요. 비워 두면 "1분+"로 보입니다.
- 형식: MP4 (H.264 + AAC)
- 방향: 세로(9:16)·가로(16:9) 모두 가능. 가로 영상은 `exercises.json`의 `orientation`을 `landscape`로 바꿔 주세요.
- 권장 크기: 720p 이하, 파일당 약 10MB 이하

## 파일이 없을 때
영상 파일이 없으면 앱은 "임시 재생 모드"로 동작합니다. 영상 대신 안내 화면이 나오고,
재생 시간만 흐릅니다(운동 흐름·시간 측정·보상 확인용).

## 새 동작 추가하기
1. 이 폴더에 영상 파일을 넣습니다.
2. `data/content/exercises.json`에 항목을 추가합니다. (`id`, `name`, `postures`, `bodyPart`, `carOk`, `video`, `orientation`, `isFirst`, `active`)
3. 자세마다 `isFirst: true`인 동작은 하나만 두세요. (첫 사용자의 첫 동작)
