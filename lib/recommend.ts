import { appConfig } from '@/lib/config';
import type { Exercise, Posture, VideoStat } from '@/lib/types';

/**
 * 영상 추천 (바둑판 순서)
 * 난이도와 상관없이 고른 자세의 영상을 모두 보여 준다.
 * 시청 기록이 쌓이면 맞춤 영상이 위로 올라온다.
 *  - 하트(좋아요) +5, 끝까지 본 횟수 +1, 바둑판에서 직접 고른 횟수 +0.5, 중간에 넘긴 횟수 -1
 * 기록이 없으면 콘텐츠 순서 그대로 ('첫 동작' 지정 영상이 맨 앞).
 */
export function videoScore(stat: VideoStat | undefined): number {
  if (!stat) return 0;
  return (stat.liked ? 5 : 0) + stat.completes + stat.picks * 0.5 - stat.quits;
}

export function rankVideos(
  exercises: Exercise[],
  posture: Posture | 'all',
  stats: Record<string, VideoStat>,
): Exercise[] {
  const pool = exercises.filter((e) => e.active && (posture === 'all' || e.postures.includes(posture)));
  const base = [...pool.filter((e) => e.isFirst), ...pool.filter((e) => !e.isFirst)];
  return base
    .map((e, i) => ({ e, i, score: videoScore(stats[e.id]) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.e);
}

export type VideoTag = keyof typeof appConfig.videoTags.labels;

/**
 * 바둑판 카드 태그. 이름과 기준은 data/content/config.json의 videoTags에서 바꾼다.
 * 자주 한 운동(frequentMinPlays번 이상) → 도전(안 해 본 challengeDifficulties 난이도) → 추천(맞춤 점수가 0보다 큼) 순서로 하나만 붙인다.
 */
export function videoTag(ex: Pick<Exercise, 'difficulty'>, stat: VideoStat | undefined): VideoTag | null {
  const { frequentMinPlays, challengeDifficulties } = appConfig.videoTags;
  const plays = stat?.plays ?? 0;
  if (plays >= frequentMinPlays) return 'frequent';
  if (plays === 0 && challengeDifficulties.includes(ex.difficulty)) return 'challenge';
  return videoScore(stat) > 0 ? 'recommended' : null;
}

/** 고른 영상을 맨 앞에 두고 뒤에 추천 영상을 이어 붙인 목록 (최대 max개) */
export function playlistFrom(ranked: Exercise[], firstId: string, max: number): string[] {
  return [firstId, ...ranked.map((e) => e.id).filter((id) => id !== firstId)].slice(0, max);
}

/** [계속 운동하기]: 방금 본 영상을 뺀 추천 목록 (다 봤으면 처음부터 다시) */
export function continuePlaylist(ranked: Exercise[], watched: string[], max: number): string[] {
  const rest = ranked.filter((e) => !watched.includes(e.id));
  return (rest.length > 0 ? rest : ranked).slice(0, max).map((e) => e.id);
}

/** 좋아요 개수. 서버가 없는 로컬 단계에서는 이 기기의 하트만 센다 (베타에서 전체 합계로 교체) */
export function likeCountOf(stat: VideoStat | undefined): number {
  return stat?.liked ? 1 : 0;
}

/** 조회수·좋아요 표시: 950, 1.2천, 3.4만 */
export function formatCount(n: number): string {
  const short = (v: number) => v.toFixed(1).replace(/\.0$/, '');
  if (n < 1000) return String(n);
  if (n < 10000) return `${short(n / 1000)}천`;
  return `${short(n / 10000)}만`;
}
