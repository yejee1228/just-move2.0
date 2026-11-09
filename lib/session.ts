/**
 * 운동 시간 규칙
 * - 실제 시청 시간(초)을 1분 단위로 내린 값이 '인정 시간'
 * - 1분 미만은 0 (기록·보상 없음)
 */
export function creditedMinutes(actualSec: number): number {
  return Math.max(0, Math.floor(actualSec / 60));
}

/** 물방울을 받으려면 영상을 한 번 재생할 때 이만큼(초) 이상 봐야 한다. 측정 오차로 딱 1분짜리 영상이 빠지지 않게 1초 여유를 둔다 */
export const DROP_VIDEO_SEC = 59;

/**
 * 물방울을 받는 재생 횟수. 영상별로 회차마다 따로 세고, 여러 영상이나 회차의 시간을 합치지 않는다.
 * slotLaps: 칸별로 반복 재생을 마친 회차의 재생 초. 지금 보는 회차는 전체 재생 시간에서 이 값을 뺀 나머지다.
 */
export function playsEarningDrop(slotPlayedSec: number[], slotLaps: number[][] = []): number {
  return slotPlayedSec.reduce((count, played, i) => {
    const laps = slotLaps[i] ?? [];
    const current = played - laps.reduce((a, b) => a + b, 0);
    return count + laps.filter((sec) => sec >= DROP_VIDEO_SEC).length + (current >= DROP_VIDEO_SEC ? 1 : 0);
  }, 0);
}

/** 하루 한도를 반영한 물방울 지급 개수 (1분 이상 본 재생 1회에 1개) */
export function dropsToGrant(
  watchedVideos: number,
  alreadyToday: number,
  dailyLimit: number,
): number {
  return Math.max(0, Math.min(watchedVideos, dailyLimit - alreadyToday));
}

/** 동작 1개를 '완료'로 칠지: 건너뛰지 않았고 영상의 일정 비율 이상 재생 */
export function isItemCompleted(
  playedSec: number,
  skipped: boolean,
  videoSec: number,
  completeRatio: number,
): boolean {
  return !skipped && playedSec >= videoSec * completeRatio;
}
