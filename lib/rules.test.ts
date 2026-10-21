import { describe, expect, it } from 'vitest';
import { addDays, dateKey, diffDays, weekStartKey } from '@/lib/date';
import { creditedMinutes, dropsToGrant, isItemCompleted } from '@/lib/session';
import { addDrops, initialFarm, waterCrop } from '@/lib/farm';
import { buildPlaylist, pickReplacement } from '@/lib/recommend';
import { pickMessage, relationOf, restBucketOf, welcomeRestDays } from '@/lib/messages';
import { appConfig } from '@/lib/config';
import { EXERCISES, TIP_CARDS, WELCOME_MESSAGES } from '@/data/content';

describe('날짜 (KST)', () => {
  it('UTC 전날 15시 이후는 한국시간으로 다음 날', () => {
    expect(dateKey('2026-10-19T15:30:00Z')).toBe('2026-10-20');
    expect(dateKey('2026-10-19T14:59:00Z')).toBe('2026-10-19');
  });
  it('날짜 계산', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(diffDays('2026-10-01', '2026-10-20')).toBe(19);
    expect(weekStartKey('2026-10-20')).toBe('2026-10-19'); // 화요일 → 월요일
    expect(weekStartKey('2026-10-25')).toBe('2026-10-19'); // 일요일 → 그 주 월요일
  });
});

describe('인정 시간·물방울', () => {
  it('1·3·5분 단위로 내림', () => {
    expect(creditedMinutes(59)).toBe(0);
    expect(creditedMinutes(60)).toBe(1);
    expect(creditedMinutes(179)).toBe(1);
    expect(creditedMinutes(270)).toBe(3); // 4분 30초 → 3분
    expect(creditedMinutes(300)).toBe(5);
    expect(creditedMinutes(900)).toBe(5);
  });
  it('하루 5개 한도', () => {
    expect(dropsToGrant(3, 0, 5)).toBe(3);
    expect(dropsToGrant(5, 3, 5)).toBe(2);
    expect(dropsToGrant(5, 5, 5)).toBe(0);
    expect(dropsToGrant(1, 7, 5)).toBe(0);
  });
  it('동작 완료 판정', () => {
    expect(isItemCompleted(48, false, 60, 0.8)).toBe(true);
    expect(isItemCompleted(47, false, 60, 0.8)).toBe(false);
    expect(isItemCompleted(60, true, 60, 0.8)).toBe(false);
  });
});

describe('농장', () => {
  const tips = TIP_CARDS.map((t) => t.id);
  it('물방울이 없으면 물을 줄 수 없다', () => {
    expect(waterCrop(initialFarm, 7, tips).watered).toBe(false);
  });
  it('7번째 물주기에 수확하고 팁 카드를 연다', () => {
    let farm = addDrops(initialFarm, 7);
    for (let i = 0; i < 6; i++) {
      const r = waterCrop(farm, 7, tips);
      expect(r.harvested).toBe(false);
      farm = r.farm;
    }
    const last = waterCrop(farm, 7, tips);
    expect(last.harvested).toBe(true);
    expect(last.farm.harvestCount).toBe(1);
    expect(last.farm.cropProgress).toBe(0);
    expect(last.unlockedTipId).toBe(tips[0]);
  });
  it('하루 여러 번 수확 가능', () => {
    let farm = addDrops(initialFarm, 14);
    for (let i = 0; i < 14; i++) farm = waterCrop(farm, 7, tips).farm;
    expect(farm.harvestCount).toBe(2);
  });
});

describe('추천', () => {
  const base = {
    exercises: EXERCISES,
    progress: {} as Record<string, number>,
    masteredThreshold: appConfig.masteredThreshold,
    newRatio: appConfig.newRatio,
    masteredChance: 0,
  };
  it('선택한 자세의 동작만 나온다', () => {
    for (const posture of ['lying', 'sitting', 'standing', 'walking'] as const) {
      const list = buildPlaylist({ ...base, posture, slots: 5 });
      expect(list).toHaveLength(5);
      expect(list.every((e) => e.postures.includes(posture))).toBe(true);
    }
  });
  it('첫 사용자의 첫 동작은 첫 동작 지정 동작', () => {
    const list = buildPlaylist({ ...base, posture: 'sitting', slots: 3 });
    expect(list[0].isFirst).toBe(true);
  });
  it('익히는 중 동작을 먼저 추천한다 (1분)', () => {
    const progress = { 'sitting-03': 2, 'sitting-01': 1 };
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      seen.add(buildPlaylist({ ...base, progress, posture: 'sitting', slots: 1 })[0].id);
    }
    expect([...seen].every((id) => id in progress)).toBe(true);
  });
  it('같은 부위가 연속되지 않는다 (가능한 경우)', () => {
    const progress = Object.fromEntries(EXERCISES.map((e) => [e.id, 1]));
    for (let i = 0; i < 50; i++) {
      const list = buildPlaylist({ ...base, progress, posture: 'walking', slots: 5 });
      for (let k = 1; k < list.length; k++) {
        if (list[k].bodyPart === list[k - 1].bodyPart) {
          // 같은 부위 후보밖에 없는 경우만 허용
          const others = EXERCISES.filter(
            (e) => e.postures.includes('walking') && e.bodyPart !== list[k - 1].bodyPart,
          );
          expect(others.length).toBe(0);
        }
      }
    }
  });
  it('3·5분은 새 동작이 섞이고 목록 안에서 중복되지 않는다', () => {
    const progress = {
      'lying-01': 2, 'lying-02': 3, 'lying-03': 1, 'lying-04': 0, 'lying-05': 0,
    };
    for (let i = 0; i < 30; i++) {
      const list = buildPlaylist({ ...base, progress, posture: 'lying', slots: 3 });
      expect(new Set(list.map((e) => e.id)).size).toBe(3);
      expect(list.some((e) => (progress[e.id as keyof typeof progress] ?? 0) === 0)).toBe(true);
    }
  });
  it('다음 동작: 현재 목록에 없는 다른 동작으로 교체', () => {
    const list = buildPlaylist({ ...base, posture: 'standing', slots: 3 });
    const ids = list.map((e) => e.id);
    const rep = pickReplacement({ ...base, posture: 'standing', slots: 3 }, ids, 1, [
      list[0].bodyPart,
      list[2].bodyPart,
    ]);
    expect(rep).not.toBeNull();
    expect(ids).not.toContain(rep!.id);
  });
});

describe('환영', () => {
  it('어제 움직였으면 보이지 않는다', () => {
    expect(welcomeRestDays(['2026-10-19'], '2026-10-20', null)).toBeNull();
  });
  it('하루 쉬고 오면 쉰 날 1', () => {
    expect(welcomeRestDays(['2026-10-18'], '2026-10-20', null)).toBe(1);
  });
  it('이력이 없거나 오늘 이미 봤다면 보이지 않는다', () => {
    expect(welcomeRestDays([], '2026-10-20', null)).toBeNull();
    expect(welcomeRestDays(['2026-10-10'], '2026-10-20', '2026-10-20')).toBeNull();
  });
  it('휴식 기간·이용 관계 구분', () => {
    expect(restBucketOf(2)).toBe('1-2');
    expect(restBucketOf(3)).toBe('3+');
    expect(relationOf('2026-08-01', '2026-10-20', 20)).toBe('long');
    expect(relationOf('2026-08-01', '2026-10-20', 19)).toBe('other');
    expect(relationOf('2026-10-01', '2026-10-20', 25)).toBe('other');
  });
  it('최근 2개와 같은 문구는 피한다', () => {
    const group = WELCOME_MESSAGES.filter((m) => m.restBucket === '1-2' && m.relation === 'other');
    for (let i = 0; i < 30; i++) {
      const m = pickMessage(group, [group[0].id, group[1].id])!;
      expect(m.id).toBe(group[2].id);
    }
  });
  it('모든 문구 그룹에 문구가 있다', () => {
    for (const rest of ['1-2', '3+'] as const)
      for (const rel of ['long', 'other'] as const)
        expect(WELCOME_MESSAGES.some((m) => m.restBucket === rest && m.relation === rel)).toBe(true);
  });
});

describe('콘텐츠', () => {
  it('자세별 5개, 첫 동작 1개씩', () => {
    for (const p of ['lying', 'sitting', 'standing', 'walking'] as const) {
      const list = EXERCISES.filter((e) => e.postures.includes(p));
      expect(list).toHaveLength(5);
      expect(list.filter((e) => e.isFirst)).toHaveLength(1);
    }
  });
  it('운동 id는 중복되지 않는다', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });
});

import { returnsOf, userMetrics } from '@/lib/metrics';

describe('검증 지표', () => {
  it('쉬었다 돌아온 기록을 휴식 기간별로 나눈다', () => {
    const r = returnsOf(['2026-10-01', '2026-10-03', '2026-10-06', '2026-10-10']);
    expect(r.map((x) => x.bucket)).toEqual(['1', '2', '3+']);
    expect(returnsOf(['2026-10-01', '2026-10-02'])).toEqual([]);
  });
  it('7일 성공: 매일 운동 또는 쉬었다 복귀', () => {
    const daily = Array.from({ length: 7 }, (_, i) => addDays('2026-10-01', i));
    expect(userMetrics(daily, '2026-10-01', '2026-10-10').week1Success).toBe(true);
    expect(userMetrics(['2026-10-01', '2026-10-03'], '2026-10-01', '2026-10-10').week1Success).toBe(true);
    expect(userMetrics(['2026-10-01', '2026-10-02'], '2026-10-01', '2026-10-10').week1Success).toBe(false);
    // 7일 창 밖의 복귀는 세지 않는다
    expect(userMetrics(['2026-10-01', '2026-10-09'], '2026-10-01', '2026-10-20').week1Success).toBe(false);
  });
  it('14일 지표', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06', '2026-10-08', '2026-10-12'];
    const m = userMetrics(days, '2026-10-01', '2026-10-20');
    expect(m.movedDaysIn14).toBe(7);
    expect(m.practiced7of14).toBe(true);
    expect(m.retainedLast3Of14).toBe(true); // D11 = 10-12
    expect(userMetrics(['2026-10-01'], '2026-10-01', '2026-10-20').retainedLast3Of14).toBe(false);
  });
});

import { reminderDueKey } from '@/lib/reminder';
import { defaultSettings } from '@/data/repository';

describe('알림', () => {
  const at = (h: number) => Date.parse('2026-10-20T00:00:00+09:00') + h * 3600_000;
  const base = defaultSettings(at(10));
  it('시작~종료 시간 안의 정각에만 보낸다', () => {
    expect(reminderDueKey(base, at(10), 0, 5)).toBe('2026-10-20T10');
    expect(reminderDueKey(base, at(8), 0, 5)).toBeNull();
    expect(reminderDueKey(base, at(21), 0, 5)).toBeNull();
    expect(reminderDueKey(base, at(9), 0, 5)).toBe('2026-10-20T09');
    expect(reminderDueKey(base, at(20), 0, 5)).toBe('2026-10-20T20');
  });
  it('앱을 중간에 열었을 때는 보내지 않는다 (정각 직후 2분만)', () => {
    expect(reminderDueKey(base, at(10) + 60_000, 0, 5)).toBe('2026-10-20T10');
    expect(reminderDueKey(base, at(10) + 2 * 60_000, 0, 5)).toBeNull();
    expect(reminderDueKey(base, at(10) + 30 * 60_000, 0, 5)).toBeNull();
  });
  it('같은 시각에는 한 번만', () => {
    const s = { ...base, reminder: { ...base.reminder, lastFiredKey: '2026-10-20T10' } };
    expect(reminderDueKey(s, at(10), 0, 5)).toBeNull();
    expect(reminderDueKey(s, at(11), 0, 5)).toBe('2026-10-20T11');
  });
  it('물방울을 다 모았거나 꺼짐·미루기·오늘은 그만이면 보내지 않는다', () => {
    expect(reminderDueKey(base, at(10), 5, 5)).toBeNull();
    expect(reminderDueKey({ ...base, notification: { ...base.notification, enabled: false } }, at(10), 0, 5)).toBeNull();
    expect(reminderDueKey({ ...base, reminder: { ...base.reminder, snoozeUntil: at(10) + 3600_000 } }, at(10), 0, 5)).toBeNull();
    expect(reminderDueKey({ ...base, reminder: { ...base.reminder, snoozeUntil: at(10) - 1 } }, at(10), 0, 5)).toBe('2026-10-20T10');
    expect(reminderDueKey({ ...base, reminder: { ...base.reminder, stopDate: '2026-10-20' } }, at(10), 0, 5)).toBeNull();
  });
});

import { badges, monthlyMessage, rewardLevel, sessionPoints } from '@/lib/rewards';
import { exerciseById } from '@/data/content';

describe('MOVE 포인트·레벨·배지 (수정 전 규칙)', () => {
  const done = () => true;
  it('완료한 동작마다 난이도 포인트, 완료 동작이 없으면 10', () => {
    const items = [
      { exerciseId: 'standing-03', playedSec: 60, skipped: false }, // 보통 20
      { exerciseId: 'standing-01', playedSec: 60, skipped: false }, // 쉬움 10
    ];
    expect(sessionPoints(items, 3, done, exerciseById)).toBe(30);
    expect(sessionPoints(items, 1, () => false, exerciseById)).toBe(10);
    expect(sessionPoints(items, 0, done, exerciseById)).toBe(0);
  });
  it('레벨 경계', () => {
    expect(rewardLevel(0).level).toBe(1);
    expect(rewardLevel(99).level).toBe(1);
    expect(rewardLevel(100).level).toBe(2);
    expect(rewardLevel(1000).level).toBe(5);
    expect(rewardLevel(150).progressPct).toBe(25);
  });
  it('배지 (7일 연속 배지는 없음)', () => {
    const b = badges(['2026-10-19', '2026-10-20', '2026-10-21'], '2026-10-21');
    expect(b.map((x) => x.id)).toEqual(['first_move', 'weekly_3', 'weekly_5', 'monthly_10']);
    expect(b.find((x) => x.id === 'weekly_3')!.unlocked).toBe(true);
    expect(b.find((x) => x.id === 'weekly_5')!.currentProgress).toBe('이번 주 3/5일');
  });
  it('월간 응원 문구 5단계', () => {
    expect(monthlyMessage(0)).toContain('첫 움직임');
    expect(monthlyMessage(4)).toContain('작은 움직임');
    expect(monthlyMessage(9)).toContain('10일');
    expect(monthlyMessage(19)).toContain('루틴');
    expect(monthlyMessage(20)).toContain('대단해요');
  });
});

import { dueSchedule, todaySchedules } from '@/lib/schedule';
import type { Schedule } from '@/lib/types';

describe('운동 예약 (수정 전 기능)', () => {
  const base: Schedule = {
    id: 'a', exerciseId: 'sitting-01', plannedMin: 1, scheduledDate: '2026-10-20', scheduledTime: '09:00',
    targetValue: 20, repeatType: 'once', status: 'scheduled', createdAt: '',
  };
  it('오늘 예약: 한번만은 그 날짜, 매일은 매일', () => {
    expect(todaySchedules([base], '2026-10-20')).toHaveLength(1);
    expect(todaySchedules([base], '2026-10-21')).toHaveLength(0);
    expect(todaySchedules([{ ...base, repeatType: 'daily' }], '2026-10-25')).toHaveLength(1);
    expect(todaySchedules([{ ...base, status: 'cancelled' }], '2026-10-20')).toHaveLength(0);
  });
  it('예약 시각부터 30분 안에, 하루 한 번만 알린다', () => {
    expect(dueSchedule([base], '2026-10-20', '08:59')).toBeNull();
    expect(dueSchedule([base], '2026-10-20', '09:00')?.id).toBe('a');
    expect(dueSchedule([base], '2026-10-20', '09:30')?.id).toBe('a');
    expect(dueSchedule([base], '2026-10-20', '09:31')).toBeNull();
    expect(dueSchedule([{ ...base, lastNotifiedDate: '2026-10-20' }], '2026-10-20', '09:05')).toBeNull();
  });
});

import { nextReminderLabel } from '@/lib/reminder';

describe('홈 알림 버튼 안내', () => {
  const at = (h: number, m = 0) => Date.parse('2026-10-20T00:00:00+09:00') + h * 3600_000 + m * 60_000;
  const s = defaultSettings(at(10));
  it('다음 정각을 알려 준다', () => {
    expect(nextReminderLabel(s, at(10, 15), 0, 5)).toBe('11시');
    expect(nextReminderLabel(s, at(7), 0, 5)).toBe('9시');
    expect(nextReminderLabel(s, at(20, 30), 0, 5)).toBe('내일 9시');
  });
  it('꺼짐·물방울 다 모음·오늘은 그만', () => {
    expect(nextReminderLabel({ ...s, notification: { ...s.notification, enabled: false } }, at(10), 0, 5)).toBe('꺼짐');
    expect(nextReminderLabel(s, at(10), 5, 5)).toBe('내일 9시');
    expect(nextReminderLabel({ ...s, reminder: { ...s.reminder, stopDate: '2026-10-20' } }, at(10), 0, 5)).toBe('내일 9시');
  });
});
