/**
 * 운동 시간 규칙
 * - 실제 시청 시간(초)을 1분 단위로 내린 값이 '인정 시간'
 * - 1분 미만은 0 (기록·보상 없음)
 */
export function creditedMinutes(actualSec: number): number {
  return Math.max(0, Math.floor(actualSec / 60));
}

/** 하루 한도를 반영한 물방울 지급 개수 (1분 이상 본 운동 1번에 1개) */
export function dropsToGrant(
  creditedMin: number,
  alreadyToday: number,
  dailyLimit: number,
): number {
  if (creditedMin < 1) return 0;
  return Math.max(0, Math.min(1, dailyLimit - alreadyToday));
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
