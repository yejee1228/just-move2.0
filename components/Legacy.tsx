import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Posture } from '@/lib/types';

/**
 * 수정 전 화면(357e0d7)에서 쓰던 공통 모양: 흐름 화면 머리, 자세 아이콘, 하단 고정 버튼 바.
 * 디자인 기준: docs/design-spec.md §6
 */

/**
 * 화면 위·아래 여백 = 기기의 안전 영역(노치·홈 막대)만큼.
 * 일반 브라우저에서는 0, 아이폰 홈 화면 앱·네이티브 앱에서는 상태표시줄 높이.
 * (수정 전에는 웹에서 위 67px을 고정으로 비워 실제 브라우저에서 빈 공간이 컸다)
 * 각 화면은 이 값 위에 작은 간격(탭 화면 16, 흐름 화면 머리 8)만 더한다.
 */
export function useLegacyPad() {
  const insets = useSafeAreaInsets();
  return { top: insets.top, bottom: insets.bottom };
}

/** 흐름 화면 머리: [‹] + 단계 점 (+ 가운데 제목) + 오른쪽 요소, 아래 가는 선 */
export function FlowHeader({
  onBack,
  step,
  totalSteps,
  title,
  right,
  dark,
}: {
  onBack: () => void;
  step?: number;
  totalSteps?: number;
  title?: string;
  right?: React.ReactNode;
  dark?: boolean;
}) {
  const colors = useColors();
  const pad = useLegacyPad();
  const fg = dark ? '#FFFFFF' : colors.primary;
  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: pad.top + 8,
          backgroundColor: dark ? colors.primary : colors.background,
          borderBottomColor: dark ? 'rgba(255,255,255,0.1)' : colors.border,
        },
      ]}
    >
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="뒤로"
        style={styles.backBtn}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={24} color={fg} />
      </Pressable>
      {title ? (
        <Text style={[styles.headerTitle, { color: dark ? '#FFFFFF' : colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      ) : step && totalSteps ? (
        <View style={styles.stepWrap} accessibilityLabel={`${totalSteps}단계 중 ${step}단계`}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <View
              key={s}
              style={[styles.stepDot, { backgroundColor: s === step ? colors.accent : colors.border }]}
            />
          ))}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={styles.rightSlot}>{right}</View>
    </View>
  );
}

export const POSTURE_META: Record<
  Posture,
  { desc: string; color: string; bg: string; icon: string; lib: 'Ionicons' | 'MCI' }
> = {
  lying: { desc: '침대·소파에 누운 상태', color: '#5B8DB8', bg: '#EBF3FB', icon: 'bed-outline', lib: 'Ionicons' },
  sitting: { desc: '의자·바닥·차 안(주차 중)에 앉은 상태', color: '#7B68EE', bg: '#F0EEFF', icon: 'seat-passenger', lib: 'MCI' },
  standing: { desc: '서 있거나 서기 가능한 상태', color: '#20B2AA', bg: '#E6F7F6', icon: 'person-outline', lib: 'Ionicons' },
  walking: { desc: '산책·이동 중인 상태', color: '#F5A623', bg: '#FEF5E7', icon: 'walk', lib: 'MCI' },
};

export const POSTURE_ORDER: Posture[] = ['lying', 'sitting', 'standing', 'walking'];

export function PostureIcon({ posture, size, color }: { posture: Posture; size: number; color?: string }) {
  const m = POSTURE_META[posture];
  const c = color ?? m.color;
  return m.lib === 'Ionicons' ? (
    <Ionicons name={m.icon as never} size={size} color={c} />
  ) : (
    <MaterialCommunityIcons name={m.icon as never} size={size} color={c} />
  );
}

/** 하단 고정 버튼 바 */
export function BottomBar({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const pad = useLegacyPad();
  return (
    <View
      style={[
        styles.bottom,
        { paddingBottom: pad.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  stepWrap: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  rightSlot: { minWidth: 40, alignItems: 'flex-end' },
  bottom: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
