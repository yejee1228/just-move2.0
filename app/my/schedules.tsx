import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { BottomBar, FlowHeader, useLegacyPad } from '@/components/Legacy';
import { exerciseById } from '@/data/content';
import { formatMonthDay } from '@/lib/date';
import { useStore } from '@/store/AppStore';

/** MY > 운동 예약 목록 (예약 카드 모양은 수정 전 홈 '오늘 예약'과 동일) */
export default function SchedulesScreen() {
  const colors = useColors();
  const pad = useLegacyPad();
  const { schedules, updateSchedule } = useStore();
  const list = schedules
    .filter((s) => s.status === 'scheduled')
    .sort((a, b) => (a.scheduledDate + a.scheduledTime).localeCompare(b.scheduledDate + b.scheduledTime));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlowHeader title="운동 예약" onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/my'))} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: pad.bottom + 40 }]}>
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>예약한 운동이 없어요</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              정해 둔 시간에 앱이 알려 드려요.
            </Text>
          </View>
        ) : (
          list.map((s) => {
            const ex = exerciseById(s.exerciseId);
            return (
              <View key={s.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.accent }]}>
                <View style={[styles.accent, { backgroundColor: colors.accent }]} />
                <View style={styles.content}>
                  <Text style={[styles.time, { color: colors.accent }]}>
                    {s.repeatType === 'daily' ? '매일' : formatMonthDay(s.scheduledDate)} {s.scheduledTime} · {s.plannedMin}분
                  </Text>
                  <Text style={[styles.title, { color: colors.text }]}>{ex?.name ?? '운동'}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="예약 취소"
                  onPress={() => updateSchedule(s.id, { status: 'cancelled' })}
                  style={[styles.cancel, { backgroundColor: colors.secondary }]}
                >
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>취소</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
      <BottomBar>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.accent, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          onPress={() => router.push('/schedule')}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addText}>새 예약</Text>
        </Pressable>
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  empty: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptySub: { fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, marginBottom: 8, overflow: 'hidden' },
  accent: { width: 4, alignSelf: 'stretch', minHeight: 64 },
  content: { flex: 1, padding: 12 },
  time: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  title: { fontSize: 15, fontWeight: '600' },
  cancel: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 12 },
  cancelText: { fontSize: 13, fontWeight: '700' },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, paddingVertical: 16 },
  addText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
});
