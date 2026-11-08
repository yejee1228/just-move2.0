import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { addDays, daysInMonth, monthStartKey, todayKey, weekdayOf } from '@/lib/date';
import { sessionCountsByDate } from '@/lib/stats';
import type { Session } from '@/lib/types';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const FIELD = '#DDF1E3';
const LEAF = '#2F7D55';

/**
 * 월간 활동 캘린더. 농장 화면처럼 흰 카드 안에 연두색 칸과 잎으로 표시한다.
 * 움직인 날만 칠하고(2회 이상이면 횟수), 쉰 날에는 아무 표시도 하지 않는다.
 */
export function MonthGrid({ sessions, month }: { sessions: Session[]; month: string }) {
  const colors = useColors();
  const today = todayKey();
  const counts = sessionCountsByDate(sessions);
  const start = monthStartKey(month);
  const lead = weekdayOf(start);
  const total = daysInMonth(start);
  const cells = Math.ceil((lead + total) / 7) * 7;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.calHeader}>
        {WEEK.map((w) => (
          <Text key={w} style={[styles.calDayLabel, { color: colors.textSecondary }]}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {Array.from({ length: cells }).map((_, idx) => {
          const dayNum = idx - lead + 1;
          const valid = dayNum >= 1 && dayNum <= total;
          const key = valid ? addDays(start, dayNum - 1) : '';
          const count = valid ? counts[key] ?? 0 : 0;
          const isToday = key === today;
          const active = count > 0;
          return (
            <View
              key={idx}
              accessibilityLabel={valid ? `${dayNum}일${active ? ` 운동 ${count}회` : ''}` : undefined}
              style={styles.calCell}
            >
              {valid ? (
                <View
                  style={[
                    styles.calDay,
                    active && { backgroundColor: FIELD },
                    isToday && { borderWidth: 1.5, borderColor: colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.calDayNum,
                      { color: active ? LEAF : colors.textSecondary },
                      active && styles.calDayNumOn,
                    ]}
                  >
                    {dayNum}
                  </Text>
                  {count > 1 ? (
                    <Text style={styles.calCount}>{count}회</Text>
                  ) : active ? (
                    <Ionicons name="leaf" size={9} color={LEAF} />
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 14 },
  calHeader: { flexDirection: 'row', marginBottom: 8 },
  calDayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  calDay: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  calDayNum: { fontSize: 13, fontWeight: '500' },
  calDayNumOn: { fontWeight: '800' },
  calCount: { fontSize: 9, fontWeight: '800', color: LEAF },
});
