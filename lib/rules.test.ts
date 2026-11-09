import { describe, expect, it } from 'vitest';
import { addDays, dateKey, diffDays, weekStartKey } from '@/lib/date';
import { creditedMinutes, dropsToGrant, isItemCompleted, playsEarningDrop } from '@/lib/session';
import { addDrops, initialFarm, waterCrop } from '@/lib/farm';
import { continuePlaylist, formatCount, playlistFrom, rankVideos, videoScore, videoTag } from '@/lib/recommend';
import { bannerForSlot, isBannerAd, planAds } from '@/lib/ads';
import { topExercises } from '@/lib/stats';
import { adStatus, adTotals, ctrText, dailyCsv, isAdLive, summaryCsv } from '@/lib/adReport';
import type { AdVideo } from '@/lib/types';
import { pickMessage, relationOf, restBucketOf, welcomeRestDays } from '@/lib/messages';
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
  it('1분 단위로 내림', () => {
    expect(creditedMinutes(59)).toBe(0);
    expect(creditedMinutes(60)).toBe(1);
    expect(creditedMinutes(179)).toBe(2);
    expect(creditedMinutes(270)).toBe(4); // 4분 30초 → 4분
    expect(creditedMinutes(900)).toBe(15);
  });
  it('1분 이상 본 영상 1개마다 물방울 1개, 하루 5개 한도', () => {
    expect(playsEarningDrop([58.9])).toBe(0);
    expect(playsEarningDrop([59.8])).toBe(1); // 측정 오차로 딱 1분짜리 영상이 빠지지 않는다
    expect(playsEarningDrop([900])).toBe(1); // 한 번 재생을 15분 봐도 1개
    expect(playsEarningDrop([30, 30, 30])).toBe(0); // 여러 영상의 시간을 합치지 않는다
    expect(playsEarningDrop([61, 20, 75, 60])).toBe(3);
    expect(playsEarningDrop([207], [[69, 69]])).toBe(3); // 3번 반복: 회차마다 1개
    expect(playsEarningDrop([100], [[69]])).toBe(1); // 지금 회차는 31초라 아직 없다
    expect(playsEarningDrop([90], [[30, 30]])).toBe(0); // 짧은 영상은 회차 시간을 합치지 않는다
    expect(dropsToGrant(0, 0, 5)).toBe(0);
    expect(dropsToGrant(3, 0, 5)).toBe(3);
    expect(dropsToGrant(3, 4, 5)).toBe(1);
    expect(dropsToGrant(3, 5, 5)).toBe(0);
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

describe('영상 추천 (바둑판 순서)', () => {
  const stat = { picks: 0, plays: 0, completes: 0, quits: 0 };
  it('선택한 자세의 영상을 난이도와 상관없이 모두 보여 준다', () => {
    for (const posture of ['lying', 'sitting', 'standing', 'walking'] as const) {
      const list = rankVideos(EXERCISES, posture, {});
      expect(list).toHaveLength(EXERCISES.filter((e) => e.active && e.postures.includes(posture)).length);
      expect(list.every((e) => e.postures.includes(posture))).toBe(true);
    }
    expect(rankVideos(EXERCISES, 'all', {})).toHaveLength(EXERCISES.filter((e) => e.active).length);
  });
  it('기록이 없으면 첫 동작 지정 영상이 맨 앞', () => {
    expect(rankVideos(EXERCISES, 'sitting', {})[0].isFirst).toBe(true);
  });
  it('끝까지 본·자주 고른 영상은 위로, 중간에 넘긴 영상은 아래로', () => {
    const list = rankVideos(EXERCISES, 'lying', {
      'lying-03': { ...stat, completes: 3, picks: 2 },
      'lying-04': { ...stat, picks: 1 },
      'lying-02': { ...stat, quits: 2 },
    });
    const ids = list.map((e) => e.id);
    expect(ids[0]).toBe('lying-03');
    expect(ids[1]).toBe('lying-04');
    expect(ids[ids.length - 1]).toBe('lying-02');
  });
  it('고른 영상이 맨 앞이고 뒤에 추천 영상이 최대 10개까지 이어진다', () => {
    const list = rankVideos(EXERCISES, 'all', {});
    const ids = list.map((e) => e.id);
    const pl = playlistFrom(list, ids[4], 10);
    expect(pl).toHaveLength(10);
    expect(pl[0]).toBe(ids[4]);
    expect(pl.slice(1, 4)).toEqual(ids.slice(0, 3));
    expect(new Set(pl).size).toBe(10);
  });
  it('계속 운동하기는 방금 본 영상을 빼고, 다 봤으면 처음부터', () => {
    const list = rankVideos(EXERCISES, 'lying', {});
    const ids = list.map((e) => e.id);
    expect(continuePlaylist(list, ids.slice(0, 2), 10)).toEqual(ids.slice(2));
    expect(continuePlaylist(list, ids, 10)).toEqual(ids);
  });
  it('하트를 누른 영상은 맞춤 점수가 오른다', () => {
    const s = { picks: 0, plays: 0, completes: 0, quits: 0 };
    expect(videoScore({ ...s, liked: true })).toBeGreaterThan(videoScore(s));
  });
  it('조회수·좋아요 표시', () => {
    expect(formatCount(950)).toBe('950');
    expect(formatCount(1200)).toBe('1.2천');
    expect(formatCount(34000)).toBe('3.4만');
    expect(formatCount(10000)).toBe('1만');
  });
});

describe('자주 한 운동', () => {
  it('30초 이상 본 것만 많이 한 순서로 센다', () => {
    const item = (exerciseId: string, playedSec: number, skipped = false) => ({ exerciseId, playedSec, skipped });
    const base = { startedAt: '', localDate: '2026-11-09', posture: 'sitting' as const, actualSec: 120, creditedMin: 2, dropsEarned: 1 };
    const top = topExercises([
      { ...base, id: '1', items: [item('a', 60), item('b', 60), item('c', 10)] },
      { ...base, id: '2', items: [item('b', 40), item('d', 60, true)] },
      { ...base, id: '3', creditedMin: 0, items: [item('a', 50)] },
    ]);
    expect(top).toEqual([{ id: 'b', count: 2 }, { id: 'a', count: 1 }]);
  });
});

describe('광고 게시 기간·결과', () => {
  const ad: AdVideo = {
    id: 'a',
    title: '=위험, "제목"',
    advertiser: '회사',
    video: 'idb:x',
    startDate: '2026-11-01',
    endDate: '2026-11-10',
    skipAfterSec: 5,
    active: true,
    stats: { '2026-11-02': { views: 10, clicks: 1 }, '2026-11-05': { views: 30, clicks: 3 } },
    createdAt: '',
  };
  it('게시 기간 양 끝 날짜까지 게시 중', () => {
    expect(adStatus(ad, '2026-10-31')).toBe('scheduled');
    expect(isAdLive(ad, '2026-11-01')).toBe(true);
    expect(isAdLive(ad, '2026-11-10')).toBe(true);
    expect(adStatus(ad, '2026-11-11')).toBe('ended');
    expect(adStatus({ ...ad, active: false }, '2026-11-05')).toBe('hidden');
  });
  it('조회 기간별 합계와 클릭률', () => {
    expect(adTotals(ad)).toEqual({ views: 40, clicks: 4 });
    expect(adTotals(ad, '2026-11-03')).toEqual({ views: 30, clicks: 3 });
    expect(adTotals(ad, '', '2026-11-02')).toEqual({ views: 10, clicks: 1 });
    expect(ctrText(40, 4)).toBe('10.0%');
    expect(ctrText(0, 0)).toBe('-');
  });
  it('CSV: 엑셀 수식이 실행되지 않고 특수문자를 감싼다', () => {
    const line = summaryCsv([ad], '2026-11-05').split('\r\n')[1];
    expect(line.startsWith('"\'=위험, ""제목"""')).toBe(true);
    expect(line.endsWith(',게시 중,40,4,10.0%')).toBe(true);
    expect(dailyCsv([ad], '2026-11-03').split('\r\n')).toHaveLength(2);
    const none = summaryCsv([{ ...ad, stats: {} }], '2026-11-05').split('\r\n')[1];
    expect(none.endsWith(',0,0,-')).toBe(true);
  });
});

describe('영상 사이 광고', () => {
  it('광고가 없으면 계획도 없다', () => {
    expect(planAds(10, [], 2, 3)).toEqual({});
  });
  it('영상 2~3개마다 들어가고 마지막 영상 뒤에는 없다', () => {
    for (let n = 0; n < 200; n++) {
      const slots = Object.keys(planAds(10, ['a', 'b'], 2, 3)).map(Number).sort((a, b) => a - b);
      expect(slots[0] === 1 || slots[0] === 2).toBe(true);
      slots.forEach((s, i) => {
        expect(s).toBeLessThan(9);
        if (i > 0) expect([2, 3]).toContain(s - slots[i - 1]);
      });
    }
  });
  it('영상이 2개 이하이면 광고 자리가 거의 없고, 광고 2개면 연달아 같은 광고가 안 나온다', () => {
    expect(planAds(1, ['a'], 2, 3)).toEqual({});
    for (let n = 0; n < 100; n++) {
      const list = Object.entries(planAds(10, ['a', 'b'], 2, 3)).sort((x, y) => Number(x[0]) - Number(y[0])).map((x) => x[1]);
      list.forEach((id, i) => {
        if (i > 0) expect(id).not.toBe(list[i - 1]);
      });
    }
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

describe('배너 광고', () => {
  it('종류가 없는 예전 광고는 영상 광고로 본다', () => {
    expect(isBannerAd({})).toBe(false);
    expect(isBannerAd({ kind: 'video' })).toBe(false);
    expect(isBannerAd({ kind: 'banner' })).toBe(true);
  });
  it('배너가 없으면 비우고, 칸이 바뀌면 다음 배너로 넘어간다', () => {
    expect(bannerForSlot([], 'a', 0)).toBeUndefined();
    expect(bannerForSlot(['x'], 'a', 7)).toBe('x');
    const list = ['x', 'y', 'z'];
    const first = bannerForSlot(list, 'session-1', 0)!;
    expect(bannerForSlot(list, 'session-1', 0)).toBe(first);
    expect(bannerForSlot(list, 'session-1', 1)).toBe(list[(list.indexOf(first) + 1) % 3]);
    expect(bannerForSlot(list, 'session-1', 3)).toBe(first);
  });
});

describe('바둑판 태그', () => {
  const s = { picks: 0, plays: 0, completes: 0, quits: 0 };
  it('자주 한 운동이 먼저, 안 해 본 보통 이상은 도전, 맞춤 점수가 있으면 추천', () => {
    expect(videoTag({ difficulty: '쉬움' }, undefined)).toBeNull();
    expect(videoTag({ difficulty: '보통' }, undefined)).toBe('challenge');
    expect(videoTag({ difficulty: '어려움' }, s)).toBe('challenge');
    expect(videoTag({ difficulty: '쉬움' }, { ...s, plays: 1, completes: 1 })).toBe('recommended');
    expect(videoTag({ difficulty: '보통' }, { ...s, plays: 1, quits: 1 })).toBeNull();
    expect(videoTag({ difficulty: '보통' }, { ...s, plays: 3, completes: 3 })).toBe('frequent');
  });
});

import { mergeCatalog, targetText } from '@/data/content';
import { sortAdsForList } from '@/lib/adReport';

describe('관리자 목록', () => {
  const ad = (id: string, createdAt: string, endDate = '2026-12-31'): AdVideo => ({
    id, title: id, advertiser: '', video: '', startDate: '2026-11-01', endDate, skipAfterSec: null, active: true, stats: {}, createdAt,
  });
  it('광고는 게시 중 먼저, 그 안에서 등록한 순서', () => {
    const list = [ad('new', '2026-11-05'), ad('ended', '2026-11-01', '2026-11-02'), ad('old', '2026-11-03'), ad('same-b', '2026-11-04'), ad('same-a', '2026-11-04')];
    expect(sortAdsForList(list, '2026-11-09').map((a) => a.id)).toEqual(['old', 'same-a', 'same-b', 'new', 'ended']);
  });
  it('삭제 표시한 기본 영상은 목록에서 빠진다', () => {
    const first = EXERCISES[0];
    const before = mergeCatalog([]).length;
    const after = mergeCatalog([{ ...first, deleted: true }]);
    expect(after).toHaveLength(before - 1);
    expect(after.some((e) => e.id === first.id)).toBe(false);
  });
});

describe('선택 입력 필드', () => {
  it('목표 값이 있을 때만 표시한다', () => {
    expect(targetText({})).toBeNull();
    expect(targetText({ targetUnit: '회' })).toBeNull();
    expect(targetText({ targetValue: 10, targetUnit: '회' })).toBe('10회');
    expect(targetText({ targetValue: 10 })).toBe('10');
    expect(targetText({ targetValue: 10, targetUnit: '회' }, 12)).toBe('12회');
  });
  it('샘플 데이터는 값이 있는 영상과 없는 영상이 섞여 있다', () => {
    expect(new Set(EXERCISES.map((e) => e.bodyPart != null)).size).toBe(2);
    expect(new Set(EXERCISES.map((e) => e.targetValue != null)).size).toBe(2);
  });
});

import { SHOP_PRODUCTS } from '@/data/content';

describe('상점 샘플', () => {
  it('해양심층수 10개, 방울토마토 한팩 20개', () => {
    expect(SHOP_PRODUCTS.map((p) => [p.name, p.price])).toEqual([['해양심층수', 10], ['방울토마토 한팩', 20]]);
  });
});
