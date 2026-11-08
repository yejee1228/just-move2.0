import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import {
  AD_STATUS_TONE,
  AdminButton,
  AdminShell,
  AdminTable,
  DateInput,
  Field,
  SectionCard,
  StatCard,
  StatusPill,
  downloadCsv,
  type Column,
} from '@/components/AdminUI';
import {
  AD_STATUS_LABEL,
  adDaily,
  adStatus,
  adTotals,
  ctrText,
  dailyCsv,
  summaryCsv,
} from '@/lib/adReport';
import { todayKey } from '@/lib/date';
import { useStore } from '@/store/AppStore';

/** A-04 관리자: 광고 결과(노출·클릭·클릭률)와 리포트 내려받기 */

const SUMMARY: Column[] = [
  { label: '광고', flex: 2 },
  { label: '광고주', flex: 1 },
  { label: '게시 기간', width: 190 },
  { label: '상태', width: 90 },
  { label: '노출', width: 80, align: 'right' },
  { label: '클릭', width: 80, align: 'right' },
  { label: '클릭률', width: 80, align: 'right' },
];

const DAILY: Column[] = [
  { label: '날짜', width: 120 },
  { label: '광고', flex: 2 },
  { label: '노출', width: 80, align: 'right' },
  { label: '클릭', width: 80, align: 'right' },
  { label: '클릭률', width: 80, align: 'right' },
];

export default function AdminReportScreen() {
  const colors = useColors();
  const { ads } = useStore();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const today = todayKey();

  const totals = useMemo(
    () =>
      ads.reduce(
        (sum, ad) => {
          const t = adTotals(ad, from, to);
          return { views: sum.views + t.views, clicks: sum.clicks + t.clicks };
        },
        { views: 0, clicks: 0 },
      ),
    [ads, from, to],
  );

  const daily = ads
    .flatMap((ad) => adDaily(ad, from, to).map((d) => ({ ad, d })))
    .sort((a, b) => b.d.date.localeCompare(a.d.date) || a.ad.title.localeCompare(b.ad.title));

  const invalid = !!from && !!to && from > to;
  const suffix = `${from || '전체'}_${to || today}`;

  return (
    <AdminShell
      active="report"
      title="광고 결과"
      action={
        <View style={styles.btns}>
          <AdminButton
            label="요약 리포트 CSV"
            icon="download-outline"
            variant="outline"
            disabled={ads.length === 0 || invalid}
            onPress={() => downloadCsv(`광고결과_요약_${suffix}.csv`, summaryCsv(ads, today, from, to))}
          />
          <AdminButton
            label="일별 리포트 CSV"
            icon="download-outline"
            disabled={ads.length === 0 || invalid}
            onPress={() => downloadCsv(`광고결과_일별_${suffix}.csv`, dailyCsv(ads, from, to))}
          />
        </View>
      }
    >
      <SectionCard>
        <View style={styles.filter}>
          <View style={styles.date}>
            <Field label="조회 시작일">
              <DateInput label="조회 시작일" value={from} onChange={setFrom} />
            </Field>
          </View>
          <View style={styles.date}>
            <Field label="조회 종료일">
              <DateInput label="조회 종료일" value={to} onChange={setTo} />
            </Field>
          </View>
          <AdminButton
            label="전체 기간"
            variant="outline"
            onPress={() => {
              setFrom('');
              setTo('');
            }}
          />
          {invalid ? <Text style={[styles.warn, { color: colors.destructive }]}>종료일이 시작일보다 빨라요.</Text> : null}
        </View>
      </SectionCard>

      <View style={styles.stats}>
        <StatCard label="총 노출" value={totals.views.toLocaleString('ko-KR')} />
        <StatCard label="총 클릭" value={totals.clicks.toLocaleString('ko-KR')} />
        <StatCard label="평균 클릭률" value={ctrText(totals.views, totals.clicks)} />
      </View>

      <SectionCard title="광고별 결과">
        <AdminTable
          columns={SUMMARY}
          empty="아직 올린 광고가 없어요."
          rows={ads.map((ad) => {
            const t = adTotals(ad, from, to);
            const status = adStatus(ad, today);
            return {
              key: ad.id,
              cells: [
                ad.title,
                ad.advertiser || '-',
                `${ad.startDate} ~ ${ad.endDate}`,
                <StatusPill key="s" label={AD_STATUS_LABEL[status]} tone={AD_STATUS_TONE[status]} />,
                t.views.toLocaleString('ko-KR'),
                t.clicks.toLocaleString('ko-KR'),
                ctrText(t.views, t.clicks),
              ],
            };
          })}
        />
      </SectionCard>

      <SectionCard title="일별 결과">
        <AdminTable
          columns={DAILY}
          empty="이 기간에 집계된 결과가 없어요."
          minWidth={640}
          rows={daily.map(({ ad, d }) => ({
            key: `${d.date}-${ad.id}`,
            cells: [d.date, ad.title, d.views.toLocaleString('ko-KR'), d.clicks.toLocaleString('ko-KR'), ctrText(d.views, d.clicks)],
          }))}
        />
      </SectionCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  btns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filter: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' },
  date: { width: 200 },
  warn: { fontSize: 13, fontWeight: '700', paddingBottom: 12 },
  stats: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
});
