import { addDays, daysInMonth, monthStartKey, weekStartKey } from '@/lib/date';
import type { Session } from '@/lib/types';

/** 움직인 날 = 인정 시간 1분 이상 세션이 있는 날 */
export function movedDateKeys(sessions: Session[]): string[] {
  return [...new Set(sessions.filter((s) => s.creditedMin >= 1).map((s) => s.localDate))].sort();
}

export function countedSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.creditedMin >= 1);
}

export function minutesOnDate(sessions: Session[], key: string): number {
  return sessions
    .filter((s) => s.localDate === key)
    .reduce((sum, s) => sum + s.creditedMin, 0);
}

export function dropsOnDate(sessions: Session[], key: string): number {
  return sessions.filter((s) => s.localDate === key).reduce((sum, s) => sum + s.dropsEarned, 0);
}

export interface MonthSummary {
  movedDays: number;
  totalMinutes: number;
}

export function monthSummary(sessions: Session[], anyKeyInMonth: string): MonthSummary {
  const prefix = anyKeyInMonth.slice(0, 7);
  const inMonth = countedSessions(sessions).filter((s) => s.localDate.startsWith(prefix));
  return {
    movedDays: new Set(inMonth.map((s) => s.localDate)).size,
    totalMinutes: inMonth.reduce((sum, s) => sum + s.creditedMin, 0),
  };
}

/** 월간 캘린더용: 해당 월의 날짜 키와 움직인 날 여부 */
export function monthDays(sessions: Session[], anyKeyInMonth: string) {
  const start = monthStartKey(anyKeyInMonth);
  const moved = new Set(movedDateKeys(sessions));
  return Array.from({ length: daysInMonth(start) }, (_, i) => {
    const key = addDays(start, i);
    return { key, moved: moved.has(key) };
  });
}

/** 월~일 일별 인정 분 */
export function weekMinutes(sessions: Session[], anyKeyInWeek: string) {
  const start = weekStartKey(anyKeyInWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(start, i);
    return { key, minutes: minutesOnDate(sessions, key) };
  });
}

export function recentSessions(sessions: Session[], n: number): Session[] {
  return countedSessions(sessions)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, n);
}

/** 많이 한 동작 순서 (30초 이상 본 것만 센다) */
export function topExercises(sessions: Session[]): { id: string; count: number }[] {
  const count: Record<string, number> = {};
  for (const s of countedSessions(sessions)) {
    for (const it of s.items) {
      if (!it.skipped && it.playedSec >= 30) count[it.exerciseId] = (count[it.exerciseId] ?? 0) + 1;
    }
  }
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ id, count: n }));
}

/** 가장 많이 한 동작 id */
export function mostPlayedExercise(sessions: Session[]): string | null {
  return topExercises(sessions)[0]?.id ?? null;
}

/** 체감 난이도 분포 (선택한 기록만) */
export function perceivedCounts(sessions: Session[]) {
  const c = { light: 0, fit: 0, hard: 0 };
  for (const s of countedSessions(sessions)) if (s.perceived) c[s.perceived]++;
  return c;
}

/** 날짜별 운동 횟수 (캘린더의 2회 이상 표시용) */
export function sessionCountsByDate(sessions: Session[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const s of countedSessions(sessions)) c[s.localDate] = (c[s.localDate] ?? 0) + 1;
  return c;
}

/** 기간 안의 통계 (기록 탭 통계 상자) */
export function rangeSummary(sessions: Session[], from: string, to: string) {
  const list = countedSessions(sessions).filter((s) => s.localDate >= from && s.localDate <= to);
  return {
    sessions: list,
    count: list.length,
    movedDays: new Set(list.map((s) => s.localDate)).size,
    minutes: list.reduce((a, s) => a + s.creditedMin, 0),
    points: list.reduce((a, s) => a + (s.points ?? 0), 0),
  };
}
