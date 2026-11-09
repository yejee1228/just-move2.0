import type { AdVideo } from '@/lib/types';

/** 광고 게시 상태와 결과 집계. 날짜는 모두 한국시간 YYYY-MM-DD */

export type AdStatus = 'hidden' | 'scheduled' | 'live' | 'ended';

export const AD_STATUS_LABEL: Record<AdStatus, string> = {
  hidden: '비공개',
  scheduled: '게시 예정',
  live: '게시 중',
  ended: '게시 종료',
};

export function adStatus(ad: AdVideo, today: string): AdStatus {
  if (!ad.active) return 'hidden';
  if (today < ad.startDate) return 'scheduled';
  return today > ad.endDate ? 'ended' : 'live';
}

export const isAdLive = (ad: AdVideo, today: string): boolean => adStatus(ad, today) === 'live';

/** 관리 목록 순서: 게시 중인 광고 먼저, 그 안에서는 등록한 순서 (수정해도 자리가 바뀌지 않는다) */
export function sortAdsForList(ads: AdVideo[], today: string): AdVideo[] {
  return [...ads].sort(
    (a, b) =>
      Number(isAdLive(b, today)) - Number(isAdLive(a, today)) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
}

export interface AdDayRow {
  date: string;
  views: number;
  clicks: number;
}

export function adDaily(ad: AdVideo, from = '', to = ''): AdDayRow[] {
  return Object.entries(ad.stats)
    .filter(([date]) => (!from || date >= from) && (!to || date <= to))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, s]) => ({ date, views: s.views, clicks: s.clicks }));
}

export function adTotals(ad: AdVideo, from = '', to = ''): { views: number; clicks: number } {
  return adDaily(ad, from, to).reduce((sum, d) => ({ views: sum.views + d.views, clicks: sum.clicks + d.clicks }), {
    views: 0,
    clicks: 0,
  });
}

/** 클릭률. 노출이 없으면 '-' */
export function ctrText(views: number, clicks: number): string {
  return views > 0 ? `${((clicks / views) * 100).toFixed(1)}%` : '-';
}

/** 엑셀에서 수식으로 실행되지 않게 하고, 쉼표·따옴표·줄바꿈이 있으면 감싼다 */
function cell(v: string | number): string {
  let s = String(v);
  if (typeof v === 'string' && s.length > 1 && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

/** 광고별 합계 리포트 */
export function summaryCsv(ads: AdVideo[], today: string, from = '', to = ''): string {
  const rows: (string | number)[][] = [['광고 제목', '광고주', '게시 시작', '게시 종료', '상태', '노출', '클릭', '클릭률']];
  for (const ad of ads) {
    const t = adTotals(ad, from, to);
    rows.push([
      ad.title,
      ad.advertiser,
      ad.startDate,
      ad.endDate,
      AD_STATUS_LABEL[adStatus(ad, today)],
      t.views,
      t.clicks,
      ctrText(t.views, t.clicks),
    ]);
  }
  return csv(rows);
}

/** 날짜·광고별 리포트 */
export function dailyCsv(ads: AdVideo[], from = '', to = ''): string {
  const rows: (string | number)[][] = [['날짜', '광고 제목', '광고주', '노출', '클릭', '클릭률']];
  const lines = ads
    .flatMap((ad) => adDaily(ad, from, to).map((d) => ({ ad, d })))
    .sort((a, b) => a.d.date.localeCompare(b.d.date) || a.ad.title.localeCompare(b.ad.title));
  for (const { ad, d } of lines) rows.push([d.date, ad.title, ad.advertiser, d.views, d.clicks, ctrText(d.views, d.clicks)]);
  return csv(rows);
}
