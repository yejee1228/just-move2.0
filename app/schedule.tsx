import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { BottomBar, FlowHeader, POSTURE_ORDER, useLegacyPad } from '@/components/Legacy';
import { Button } from '@/components/ui';
import { allExercises, exerciseById } from '@/data/content';
import { addDays, todayKey } from '@/lib/date';
import { POSTURE_LABEL, type Posture } from '@/lib/types';
import { useStore } from '@/store/AppStore';

/**
 * 운동 예약 — 수정 전 예약 화면(357e0d7)을 그대로 옮겼다.
 * 수정 전에는 운동 상세에서 들어왔지만 상세 화면이 없어져서, 위쪽에서 운동을 고르게 했다.
 */
const DATE_PRESETS = ['오늘', '내일', '직접 입력'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_LIST = ['00', '10', '20', '30', '40', '50'];

export default function ScheduleScreen() {
  const colors = useColors();
  const pad = useLegacyPad();
  const params = useLocalSearchParams<{ exerciseId?: string }>();
  const { addSchedule } = useStore();

  const initial = exerciseById(params.exerciseId ?? '') ?? allExercises().find((e) => e.active)!;
  const [exId, setExId] = useState(initial.id);
  const [picking, setPicking] = useState(!params.exerciseId);
  const [pickPosture, setPickPosture] = useState<Posture>(initial.postures[0]);
  const ex = exerciseById(exId)!;

  const [datePreset, setDatePreset] = useState<string>('오늘');
  const [customDate, setCustomDate] = useState('');
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');
  const [repeat, setRepeat] = useState<'once' | 'daily'>('once');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const today = todayKey();
  const tomorrow = addDays(today, 1);
  const getScheduledDate = () => {
    if (datePreset === '오늘') return today;
    if (datePreset === '내일') return tomorrow;
    return customDate || today;
  };
  const dateLabel = (d: string) => (d === today ? '오늘' : d === tomorrow ? '내일' : d);

  const chooseExercise = (id: string) => {
    const e = exerciseById(id);
    if (!e) return;
    setExId(id);
    setPicking(false);
  };

  const handleSave = () => {
    const date = getScheduledDate();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('YYYY-MM-DD 형식으로 입력해주세요. 예: 2026-07-30');
      return;
    }
    setError(null);
    addSchedule({
      exerciseId: ex.id,
      plannedMin: 1, // 모든 영상은 1분
      scheduledDate: date,
      scheduledTime: `${hour}:${minute}`,
      repeatType: repeat,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDone(
      `${repeat === 'daily' ? '매일' : dateLabel(date)} ${hour}:${minute}에 ${ex.name} 운동을 예약했어요.\n\n앱이 열려있을 때 알림이 표시돼요.`,
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlowHeader title="운동 예약" onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: pad.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 예약할 운동 */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="예약할 운동 바꾸기"
            onPress={() => setPicking((p) => !p)}
            style={[styles.exCard, { backgroundColor: colors.primary }]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.exCardLabel}>예약할 운동</Text>
              <Text style={styles.exCardTitle}>{ex.name}</Text>
              <Text style={styles.exCardSub}>
                {POSTURE_LABEL[ex.postures[0]]}
              </Text>
            </View>
            <Ionicons name={picking ? 'chevron-up' : 'chevron-down'} size={20} color="#FFFFFF" />
          </Pressable>

          {picking ? (
            <View style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.presetRow}>
                {POSTURE_ORDER.map((p) => (
                  <Pressable
                    key={p}
                    style={[
                      styles.presetBtn,
                      {
                        backgroundColor: pickPosture === p ? colors.primary : colors.card,
                        borderColor: pickPosture === p ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setPickPosture(p)}
                  >
                    <Text style={[styles.presetText, { color: pickPosture === p ? '#FFFFFF' : colors.text }]}>
                      {POSTURE_LABEL[p]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {allExercises().filter((e) => e.active && e.postures.includes(pickPosture)).map((e) => (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  onPress={() => chooseExercise(e.id)}
                  style={[styles.pickItem, { borderColor: colors.border }]}
                >
                  <Text style={[styles.pickName, { color: colors.text }]}>{e.name}</Text>
                  {e.id === exId ? <Ionicons name="checkmark-circle" size={18} color={colors.accent} /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* 날짜 */}
          <Text style={[styles.fieldLabel, { color: colors.text }]}>날짜</Text>
          <View style={styles.presetRow}>
            {DATE_PRESETS.map((p) => (
              <Pressable
                key={p}
                style={[
                  styles.presetBtn,
                  { backgroundColor: datePreset === p ? colors.primary : colors.card, borderColor: datePreset === p ? colors.primary : colors.border },
                ]}
                onPress={() => setDatePreset(p)}
              >
                <Text style={[styles.presetText, { color: datePreset === p ? '#FFFFFF' : colors.text }]}>{p}</Text>
              </Pressable>
            ))}
          </View>
          {datePreset === '직접 입력' ? (
            <TextInput
              value={customDate}
              onChangeText={setCustomDate}
              placeholder="YYYY-MM-DD (예: 2026-07-30)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          ) : null}

          {/* 시간 */}
          <Text style={[styles.fieldLabel, { color: colors.text }]}>시간</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeScrollWrap}>
              <Text style={[styles.timeScrollLabel, { color: colors.textSecondary }]}>시</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll} contentContainerStyle={styles.timeScrollContent}>
                {HOURS.map((h) => (
                  <Pressable
                    key={h}
                    style={[styles.timeChip, { backgroundColor: hour === h ? colors.accent : colors.card, borderColor: hour === h ? colors.accent : colors.border }]}
                    onPress={() => setHour(h)}
                  >
                    <Text style={[styles.timeChipText, { color: hour === h ? '#FFFFFF' : colors.text }]}>{h}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Text style={[styles.timeSep, { color: colors.text }]}>:</Text>
            <View style={styles.timeScrollWrap}>
              <Text style={[styles.timeScrollLabel, { color: colors.textSecondary }]}>분</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll} contentContainerStyle={styles.timeScrollContent}>
                {MINUTES_LIST.map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.timeChip, { backgroundColor: minute === m ? colors.accent : colors.card, borderColor: minute === m ? colors.accent : colors.border }]}
                    onPress={() => setMinute(m)}
                  >
                    <Text style={[styles.timeChipText, { color: minute === m ? '#FFFFFF' : colors.text }]}>{m}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
          <Text style={[styles.timePreview, { color: colors.textSecondary }]}>
            예약 시각: {repeat === 'daily' ? '매일' : dateLabel(getScheduledDate())} {hour}:{minute}
          </Text>

          {/* 반복 */}
          <Text style={[styles.fieldLabel, { color: colors.text }]}>반복</Text>
          <View style={styles.repeatRow}>
            {(['once', 'daily'] as const).map((r) => (
              <Pressable
                key={r}
                style={[styles.repeatBtn, { backgroundColor: repeat === r ? colors.primary : colors.card, borderColor: repeat === r ? colors.primary : colors.border }]}
                onPress={() => setRepeat(r)}
              >
                <Ionicons name={r === 'once' ? 'today-outline' : 'repeat'} size={16} color={repeat === r ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.repeatText, { color: repeat === r ? '#FFFFFF' : colors.text }]}>
                  {r === 'once' ? '한번만' : '매일 반복'}
                </Text>
              </Pressable>
            ))}
          </View>

          {error ? (
            <View style={[styles.notice, { backgroundColor: colors.destructiveLight, borderColor: colors.destructiveLight, marginBottom: 12 }]}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
              <Text style={[styles.noticeText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <View style={[styles.notice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              예약 알림은 앱이 열려있을 때 화면 안에서 표시돼요. 앱을 닫아도 받는 알림은 정식 서비스에서 지원할 예정이에요.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomBar>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.accent, transform: [{ scale: pressed ? 0.97 : 1 }], shadowColor: colors.accent },
          ]}
          onPress={handleSave}
        >
          <Ionicons name="calendar" size={18} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>예약 저장</Text>
        </Pressable>
      </BottomBar>

      <Modal visible={!!done} transparent animationType="fade" onRequestClose={() => router.replace('/(tabs)')}>
        <View style={styles.modalBack}>
          <View style={[styles.dialog, { backgroundColor: colors.card }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>예약 완료</Text>
            <Text style={[styles.dialogText, { color: colors.textSecondary }]}>{done}</Text>
            <Button label="확인" onPress={() => router.replace('/(tabs)')} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  exCard: { borderRadius: 14, padding: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  exCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  exCardTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  exCardSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  picker: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  pickItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  pickName: { fontSize: 15, fontWeight: '600' },
  fieldLabel: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 12 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  presetBtn: { borderRadius: 8, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 16 },
  presetText: { fontSize: 14, fontWeight: '600' },
  textInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14, marginBottom: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 8 },
  timeScrollWrap: { flex: 1 },
  timeScrollLabel: { fontSize: 12, marginBottom: 6 },
  timeScroll: { maxHeight: 44 },
  timeScrollContent: { gap: 6, paddingHorizontal: 2 },
  timeChip: { borderRadius: 8, borderWidth: 1, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  timeChipText: { fontSize: 13, fontWeight: '700' },
  timeSep: { fontSize: 20, fontWeight: '700', paddingBottom: 10, paddingHorizontal: 4 },
  timePreview: { fontSize: 13, marginBottom: 8, textAlign: 'center' },
  repeatRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  repeatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, borderWidth: 1.5, paddingVertical: 12 },
  repeatText: { fontSize: 14, fontWeight: '600' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 8, borderWidth: 1, padding: 12 },
  noticeText: { fontSize: 12, flex: 1, lineHeight: 18 },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 17,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  dialog: { borderRadius: 24, padding: 24, gap: 12 },
  dialogTitle: { fontSize: 20, fontWeight: '800' },
  dialogText: { fontSize: 14, lineHeight: 21 },
});
