import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import {
  BarChart,
  PerceivedRow,
  PeriodNav,
  SectionLabel,
  Segment,
  StatBox,
} from '@/components/StatsUI';
import { POSTURE_META, PostureIcon } from '@/components/Legacy';
import { MonthGrid } from '@/components/MonthCalendar';
import { exerciseById } from '@/data/content';
import {
  addDays,
  addMonths,
  formatKoMonth,
  formatMonthDay,
  kstTime,
  monthStartKey,
  todayKey,
  weekStartKey,
} from '@/lib/date';
import { monthlyMessage } from '@/lib/rewards';
import {
  countedSessions,
  mostPlayedExercise,
  perceivedCounts,
  rangeSummary,
  topExercises,
  weekMinutes,
} from '@/lib/stats';
import { PERCEIVED_LABEL, type Exercise, type Session } from '@/lib/types';
import { useStore } from '@/store/AppStore';

/**
 * 기록 탭 — 수정 전 기록 탭(357e0d7)의 3구간 구성과 디자인을 유지한다.
 * 바뀐 점: 연속 기록·'부분' 표시 제거(운영 원칙), 삭제 버튼 보류, 막대는 운동 시간(분).
 */

type SegmentName = '최근 기록' | '주간 통계' | '월간 통계';
const SEGMENTS: SegmentName[] = ['최근 기록', '주간 통계', '월간 통계'];
const WEEK_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const TOP_N = 5;

/** 그 운동에서 실제로 본 영상 (본 순서, 지금 없는 영상은 뺀다) */
function playedExercises(s: Session): Exercise[] {
  const ids = s.items.filter((it) => !it.skipped && it.playedSec > 0).map((it) => it.exerciseId);
  return [...new Set(ids)].map((id) => exerciseById(id)).filter((e): e is Exercise => !!e);
}

function StatRow({ sum, drops }: { sum: ReturnType<typeof rangeSummary>; drops: number }) {
  return (
    <View style={styles.statGrid}>
      <StatBox compact label="완료 횟수" value={String(sum.count)} />
      <StatBox compact label="운동한 날" value={`${sum.movedDays}일`} />
      <StatBox compact label="운동 시간" value={sum.minutes > 0 ? `${sum.minutes}분` : '-'} />
      <StatBox compact label="MOVE" value={String(sum.points)} />
      <StatBox compact label="물방울" value={`${drops}개`} />
    </View>
  );
}

/** 가장 자주 했던 운동 순위 */
function TopExercises({ sessions }: { sessions: Session[] }) {
  const colors = useColors();
  const rows = topExercises(sessions)
    .map((t) => ({ ...t, ex: exerciseById(t.id) }))
    .filter((t): t is typeof t & { ex: Exercise } => !!t.ex)
    .slice(0, TOP_N);
  if (rows.length === 0) return null;
  return (
    <>
      <SectionLabel>가장 자주 했던 운동 TOP {TOP_N}</SectionLabel>
      <View style={[styles.topCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {rows.map(({ ex, count }, i) => (
          <View key={ex.id} style={styles.topRow}>
            <View style={[styles.rank, { backgroundColor: i === 0 ? colors.accent : colors.secondary }]}>
              <Text style={[styles.rankText, { color: i === 0 ? '#FFFFFF' : colors.textSecondary }]}>{i + 1}</Text>
            </View>
            <View style={[styles.topIcon, { backgroundColor: POSTURE_META[ex.postures[0]].bg }]}>
              <PostureIcon posture={ex.postures[0]} size={18} />
            </View>
            <Text style={[styles.topName, { color: colors.text }]} numberOfLines={1}>
              {ex.name}
            </Text>
            <Text style={[styles.topCount, { color: colors.primary }]}>{count}회</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function RecordCard({ item }: { item: Session }) {
  const colors = useColors();
  const { startSelected } = useStore();
  const [showAll, setShowAll] = useState(false);
  const played = playedExercises(item);
  const title = played.length > 1 ? `${played[0].name} +${played.length - 1}` : (played[0]?.name ?? '운동');
  const countText = item.counts
    ? Object.entries(item.counts)
        .map(([id, n]) => `${exerciseById(id)?.name ?? ''} ${n}${exerciseById(id)?.targetUnit?.replace(/\s*\(.*\)/, '') ?? '회'}`)
        .join(', ')
    : '';
  const replay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (startSelected(played.map((e) => e.id), item.scope ?? item.posture)) router.push('/exercise/play');
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.successLight }]}>
      <View style={styles.cardLeft}>
        <View style={styles.cardTop}>
          <View style={[styles.statusBadge, styles.statusBadgeTop, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[styles.statusText, { color: colors.success }]}>완료</Text>
            {item.perceived ? (
              <Text style={[styles.statusText, { color: colors.textSecondary, marginLeft: 4 }]}>
                · {PERCEIVED_LABEL[item.perceived]}
              </Text>
            ) : null}
          </View>
          {played.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={replay} hitSlop={10} style={styles.replay}>
              <Text style={[styles.replayText, { color: colors.primary }]} numberOfLines={1}>
                이 루틴으로 한번 더 운동하기
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {formatMonthDay(item.localDate)} {kstTime(item.startedAt)}
        </Text>
        <View style={styles.valueRow}>
          <Ionicons name="trophy-outline" size={13} color={colors.accent} />
          <Text style={[styles.valueText, { color: colors.text }]}>{item.creditedMin}분</Text>
          {item.points !== undefined ? (
            <Text style={[styles.posTag, { color: colors.primary, fontWeight: '700' }]}>· +{item.points} MOVE</Text>
          ) : null}
          {item.dropsEarned > 0 ? (
            <Text style={[styles.posTag, { color: '#3B9AE1', fontWeight: '700' }]}>· 물방울 {item.dropsEarned}</Text>
          ) : null}
        </View>
        {countText ? (
          <Text style={[styles.memo, { color: colors.textSecondary, fontStyle: 'normal' }]} numberOfLines={2}>
            {countText}
          </Text>
        ) : null}
        {item.memo ? (
          <Text style={[styles.memo, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.memo}
          </Text>
        ) : null}

        {showAll ? (
          <View style={[styles.exList, { borderTopColor: colors.border }]}>
            {played.map((e, i) => (
              <View key={e.id} style={styles.exItem}>
                <Text style={[styles.exNum, { color: colors.accent }]}>{i + 1}</Text>
                <Text style={[styles.exName, { color: colors.text }]}>{e.name}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {played.length > 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showAll }}
            accessibilityLabel={showAll ? '운동 목록 접기' : '진행한 운동 모두 보기'}
            onPress={() => setShowAll((v) => !v)}
            hitSlop={10}
            style={styles.more}
          >
            <Text style={[styles.moreText, { color: colors.textSecondary }]}>more</Text>
            <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function EmptyMove({ title, sub }: { title: string; sub?: string }) {
  const colors = useColors();
  return (
    <>
      <Ionicons name="calendar-outline" size={48} color={colors.border} />
      <Text style={[styles.emptyTitle2, { color: colors.text }]}>{title}</Text>
      {sub ? <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{sub}</Text> : null}
      {sub ? (
        <Pressable
          accessibilityRole="button"
          style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/exercise/videos');
          }}
        >
          <Ionicons name="flash" size={16} color="#FFF" />
          <Text style={styles.emptyBtnText}>지금 움직이기</Text>
        </Pressable>
      ) : null}
    </>
  );
}

function WeeklyStats({ sessions }: { sessions: Session[] }) {
  const [offset, setOffset] = useState(0);
  const ws = weekStartKey(addDays(todayKey(), offset * 7));
  const we = addDays(ws, 6);
  const sum = rangeSummary(sessions, ws, we);
  const drops = sum.sessions.reduce((a, s) => a + s.dropsEarned, 0);
  const isThisWeek = offset === 0;
  const label = isThisWeek
    ? `이번 주 (${formatMonthDay(ws)} ~ ${formatMonthDay(we)})`
    : `${formatMonthDay(ws)} - ${formatMonthDay(we)}`;
  const minutes = weekMinutes(sessions, ws).map((d) => d.minutes);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
      <PeriodNav
        label={label}
        onPrev={() => setOffset((o) => o - 1)}
        onNext={() => setOffset((o) => o + 1)}
        nextDisabled={offset >= 0}
      />
      {sum.count === 0 ? (
        <View style={styles.empty2}>
          <EmptyMove
            title={isThisWeek ? '이번 주에는 아직 완료한 운동이 없어요.' : '이 주에는 완료한 운동이 없어요.'}
            sub={isThisWeek ? '1분이라도 움직이면 첫 기록이 만들어져요.' : undefined}
          />
          <View style={{ width: '100%', marginTop: 24 }}>
            <BarChart values={[0, 0, 0, 0, 0, 0, 0]} labels={WEEK_LABELS} />
          </View>
        </View>
      ) : (
        <>
          <StatRow sum={sum} drops={drops} />
          <SectionLabel>체감 난이도별</SectionLabel>
          <PerceivedRow counts={perceivedCounts(sum.sessions)} />
          <SectionLabel>일별 운동 시간 (분)</SectionLabel>
          <BarChart values={minutes} labels={WEEK_LABELS} />
          <TopExercises sessions={sum.sessions} />
        </>
      )}
    </ScrollView>
  );
}

function MonthlyStats({ sessions }: { sessions: Session[] }) {
  const colors = useColors();
  const current = monthStartKey(todayKey());
  const [month, setMonth] = useState(current);
  const end = addDays(addMonths(month, 1), -1);
  const sum = rangeSummary(sessions, month, end);
  const drops = sum.sessions.reduce((a, s) => a + s.dropsEarned, 0);
  const topId = mostPlayedExercise(sum.sessions);
  const topTitle = topId ? exerciseById(topId)?.name : null;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
      <PeriodNav
        big
        label={formatKoMonth(month)}
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
        nextDisabled={month >= current}
      />
      <StatRow sum={sum} drops={drops} />
      <SectionLabel>체감 난이도별</SectionLabel>
      <PerceivedRow counts={perceivedCounts(sum.sessions)} />
      {topTitle ? (
        <View style={[styles.topExBox, { backgroundColor: colors.secondary }]}>
          <Ionicons name="trophy-outline" size={14} color={colors.accent} />
          <Text style={[styles.topExText, { color: colors.text }]}>
            가장 많이 완료한 운동: <Text style={{ fontWeight: '800' }}>{topTitle}</Text>
          </Text>
        </View>
      ) : null}
      <SectionLabel>월간 활동</SectionLabel>
      <MonthGrid sessions={sessions} month={month} />
      <View style={[styles.msgBox, { backgroundColor: '#EAF5EC' }]}>
        <Text style={[styles.msgText, { color: colors.text }]}>{monthlyMessage(sum.movedDays)}</Text>
      </View>
    </ScrollView>
  );
}

export default function RecordsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initial = SEGMENTS.find((s) => s === params.tab) ?? '최근 기록';
  const [segment, setSegment] = useState<SegmentName>(initial);
  // MY의 '주간/월간 통계 보기'에서 들어오면 해당 구간을 연다
  useEffect(() => {
    const t = SEGMENTS.find((s) => s === params.tab);
    if (t) setSegment(t);
  }, [params.tab]);
  const { sessions } = useStore();
  const topPad = insets.top;

  const recent = useMemo(
    () => [...countedSessions(sessions)].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 10),
    [sessions],
  );

  const renderItem = ({ item }: { item: Session }) => <RecordCard item={item} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.primary }]}>운동 기록</Text>
        <Segment items={SEGMENTS} value={segment} onChange={setSegment} />
      </View>

      {segment === '최근 기록' ? (
        <FlatList
          data={recent}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="list-circle-outline" size={56} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>아직 운동 기록이 없어요</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>오늘 1분부터 시작해볼까요?</Text>
            </View>
          }
        />
      ) : segment === '주간 통계' ? (
        <View style={styles.statsWrap}>
          <WeeklyStats sessions={sessions} />
        </View>
      ) : (
        <View style={styles.statsWrap}>
          <MonthlyStats sessions={sessions} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  statsWrap: { flex: 1, paddingHorizontal: 20 },
  statsScroll: { paddingBottom: 120 },
  statGrid: { flexDirection: 'row', gap: 6 },
  topCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  rank: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '800' },
  topIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  topName: { flex: 1, fontSize: 14, fontWeight: '700' },
  topCount: { fontSize: 14, fontWeight: '800' },
  exList: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 10, gap: 8 },
  exItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exNum: { width: 18, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  exName: { flex: 1, fontSize: 14, fontWeight: '600' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  statusBadgeTop: { marginBottom: 0 },
  replay: { flexShrink: 1 },
  replayText: { fontSize: 11, fontWeight: '700' },
  more: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 2, minHeight: 24, marginTop: 8 },
  moreText: { fontSize: 12, fontWeight: '700' },
  empty2: { alignItems: 'center', paddingTop: 24, gap: 10 },
  emptyTitle2: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 13, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 4,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  topExBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10, marginTop: 8 },
  topExText: { fontSize: 13, flex: 1 },
  msgBox: { borderRadius: 12, padding: 14, marginTop: 16 },
  msgText: { fontSize: 14, lineHeight: 22 },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 12, gap: 12 },
  cardLeft: { flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  exerciseName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  meta: { fontSize: 12, marginBottom: 6 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  valueText: { fontSize: 13, fontWeight: '700' },
  posTag: { fontSize: 12 },
  memo: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14 },
});
