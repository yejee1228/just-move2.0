import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { PERCEIVED_LABEL, type Perceived } from '@/lib/types';

/**
 * 수정 전 기록 탭(app/(tabs)/records.tsx, 357e0d7)의 통계 부품을 그대로 옮긴 것.
 * 디자인 기준: docs/design-spec.md §6-5
 */

type Colors = ReturnType<typeof useColors>;

export function StatBox({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  const colors = useColors();
  return (
    <View style={[statBox.box, compact && statBox.boxCompact, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[statBox.val, compact && statBox.valCompact, { color: colors.primary }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[statBox.lbl, compact && statBox.lblCompact, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const statBox = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 4 },
  boxCompact: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 2 },
  val: { fontSize: 20, fontWeight: '800' },
  valCompact: { fontSize: 15 },
  lbl: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  lblCompact: { fontSize: 10 },
});

export const PERCEIVED_COLORS = (colors: Colors): Record<Perceived, { bg: string; fg: string }> => ({
  light: { bg: colors.secondary, fg: colors.textSecondary },
  fit: { bg: '#FFF3E0', fg: '#B45309' },
  hard: { bg: '#E8F0F7', fg: '#173B57' },
});

/** 체감 난이도별 개수 칩 (수정 전 '난이도별' 자리) */
export function PerceivedRow({ counts }: { counts: Record<Perceived, number> }) {
  const colors = useColors();
  const c = PERCEIVED_COLORS(colors);
  return (
    <View style={chip.row}>
      {(['light', 'fit', 'hard'] as Perceived[]).map((p) => (
        <View key={p} style={[chip.tag, { backgroundColor: c[p].bg }]}>
          <Text style={[chip.tagText, { color: c[p].fg }]}>
            {PERCEIVED_LABEL[p]} {counts[p]}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function PerceivedChip({ value }: { value: Perceived }) {
  const colors = useColors();
  const c = PERCEIVED_COLORS(colors)[value];
  return (
    <View style={[chip.tag, { backgroundColor: c.bg, alignSelf: 'flex-start' }]}>
      <Text style={[chip.tagText, { color: c.fg }]}>{PERCEIVED_LABEL[value]}</Text>
    </View>
  );
}

const chip = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, fontWeight: '700' },
});

/** 수정 전 일별 막대 그래프 (막대 영역 높이 80) */
export function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const colors = useColors();
  const max = Math.max(...values, 1);
  const BAR_H = 80;
  return (
    <View style={bar.wrap}>
      {values.map((v, i) => (
        <View key={i} style={bar.col} accessibilityLabel={`${labels[i]} ${v}`}>
          <Text style={[bar.countLabel, { color: v > 0 ? colors.primary : colors.textSecondary }]}>
            {v > 0 ? v : ''}
          </Text>
          <View style={[bar.barBg, { height: BAR_H, backgroundColor: colors.muted }]}>
            <View
              style={[
                bar.bar,
                {
                  height: Math.max(4, (v / max) * BAR_H),
                  backgroundColor: v > 0 ? colors.primary : colors.border,
                },
              ]}
            />
          </View>
          <Text style={[bar.dayLabel, { color: colors.textSecondary }]}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

const bar = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  col: { flex: 1, alignItems: 'center', gap: 2 },
  countLabel: { fontSize: 11, fontWeight: '700', height: 16 },
  barBg: { width: '100%', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 4 },
  dayLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
});

/** 기간 이동 줄 [‹] 라벨 [›] — 미래로는 이동하지 않는다 */
export function PeriodNav({
  label,
  onPrev,
  onNext,
  nextDisabled,
  big,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  big?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={nav.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="이전"
        onPress={onPrev}
        style={({ pressed }) => [nav.btn, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}
      >
        <Ionicons name="chevron-back" size={18} color={colors.primary} />
      </Pressable>
      <Text
        style={[nav.label, big ? nav.labelBig : null, { color: colors.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="다음"
        accessibilityState={{ disabled: nextDisabled }}
        onPress={onNext}
        disabled={nextDisabled}
        style={({ pressed }) => [
          nav.btn,
          { backgroundColor: colors.secondary, opacity: nextDisabled ? 0.3 : pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const nav = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  btn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  labelBig: { fontSize: 16, fontWeight: '800' },
});

/** 수정 전 세그먼트 컨트롤 */
export function Segment<T extends string>({
  items,
  value,
  onChange,
}: {
  items: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={[seg.row, { backgroundColor: colors.secondary }]}>
      {items.map((it) => {
        const active = it === value;
        return (
          <Pressable
            key={it}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(it)}
            style={[seg.btn, active && { backgroundColor: colors.primary }]}
          >
            <Text
              style={[seg.text, { color: active ? '#FFFFFF' : colors.textSecondary }, active && { fontWeight: '800' }]}
              numberOfLines={1}
            >
              {it}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const seg = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  text: { fontSize: 13, fontWeight: '600' },
});

/** 섹션 라벨 (기록 화면 안) */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={[sectionLabel.text, { color: colors.text }]}>{children}</Text>;
}

const sectionLabel = StyleSheet.create({
  text: { fontSize: 13, fontWeight: '700', marginTop: 20, marginBottom: 10 },
});
