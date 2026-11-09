import React, { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Button } from '@/components/ui';
import { NOTIFICATION_MESSAGES, exerciseById } from '@/data/content';
import { dueSchedule } from '@/lib/schedule';
import type { Schedule } from '@/lib/types';
import { appConfig } from '@/lib/config';
import { dateKey, kstHour, todayKey } from '@/lib/date';
import { pickMessage } from '@/lib/messages';
import { reminderDueKey } from '@/lib/reminder';
import { dropsOnDate } from '@/lib/stats';
import { useStore } from '@/store/AppStore';

const HOUR_MS = 60 * 60 * 1000;

/**
 * 앱이 열려 있는 동안의 알림(로컬 단계).
 * 앱이 닫혀 있을 때의 웹 푸시는 서버가 필요하므로 베타 단계에서 연결한다.
 * 정각이 되면 안내 시트를 띄우고, 1시간 뒤 / 3시간 뒤 / 오늘은 그만 중에서 고를 수 있다.
 */
export function ReminderHost() {
  const colors = useColors();
  const pathname = usePathname();
  const {
    ready,
    sessions,
    settings,
    history,
    schedules,
    setReminder,
    recordNotificationShown,
    updateSchedule,
    startSession,
  } = useStore();
  const [message, setMessage] = useState<{ id: string; text: string } | null>(null);
  // 수정 전 운동 예약 알림 ("운동 시간이에요!")
  const [scheduleAlert, setScheduleAlert] = useState<Schedule | null>(null);

  const movedToday = sessions.some((s) => s.localDate === todayKey() && s.creditedMin >= 1);

  const check = useCallback(() => {
    if (!ready || message || scheduleAlert) return;
    if (pathname.startsWith('/exercise/play') || pathname.startsWith('/admin')) return; // 운동·관리 중에는 방해하지 않는다
    const now = Date.now();
    const today = dateKey(now);
    const minutes = new Date(now + 9 * 60 * 60 * 1000).getUTCMinutes();
    const hhmm = `${String(kstHour(now)).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const due = dueSchedule(schedules, today, hhmm);
    if (due) {
      updateSchedule(due.id, { lastNotifiedDate: today });
      setScheduleAlert(due);
      return;
    }
    const key = reminderDueKey(settings, now, dropsOnDate(sessions, dateKey(now)), appConfig.dropDailyLimit);
    if (!key) return;
    const pool = NOTIFICATION_MESSAGES.filter((m) => m.segment === (movedToday ? 'moved' : 'not_moved'));
    const m = pickMessage(pool, history.notification);
    if (!m) return;
    setReminder({ lastFiredKey: key });
    recordNotificationShown(m.id);
    setMessage({ id: m.id, text: m.text });
    // 화면이 숨겨져 있으면 브라우저 알림도 함께 보낸다 (권한이 허용된 경우)
    try {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden' &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification('JUST MOVE', { body: m.text });
      }
    } catch {
      // 지원하지 않는 환경: 무시
    }
  }, [ready, message, scheduleAlert, pathname, settings, sessions, schedules, history.notification, movedToday, setReminder, recordNotificationShown, updateSchedule]);

  useEffect(() => {
    check();
    const timer = setInterval(check, 30 * 1000);
    return () => clearInterval(timer);
  }, [check]);

  const close = () => setMessage(null);
  const alertEx = scheduleAlert ? exerciseById(scheduleAlert.exerciseId) : undefined;

  return (
    <>
    <Modal visible={!!scheduleAlert} transparent animationType="fade" onRequestClose={() => setScheduleAlert(null)}>
      <View style={styles.back}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>운동 시간이에요!</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {alertEx?.name} 예약한 시간이 됐어요.
          </Text>
          <Button
            label="지금 시작"
            variant="accent"
            onPress={() => {
              const s = scheduleAlert;
              setScheduleAlert(null);
              if (!s || !alertEx) return;
              if (!startSession(alertEx.id)) return;
              if (s.repeatType === 'once') updateSchedule(s.id, { status: 'completed' });
              router.push('/exercise/play');
            }}
          />
          <Button label="나중에" variant="ghost" onPress={() => setScheduleAlert(null)} />
        </View>
      </View>
    </Modal>
    <Modal visible={!!message} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.back}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>{message?.text}</Text>
          <Button
            label="지금 1분 하기"
            variant="accent"
            onPress={() => {
              close();
              router.push('/exercise/videos');
            }}
          />
          <Button
            label="1시간 뒤"
            variant="outline"
            onPress={() => {
              setReminder({ snoozeUntil: Date.now() + HOUR_MS });
              close();
            }}
          />
          <Button
            label="3시간 뒤"
            variant="outline"
            onPress={() => {
              setReminder({ snoozeUntil: Date.now() + 3 * HOUR_MS });
              close();
            }}
          />
          <Button
            label="오늘은 그만"
            variant="ghost"
            onPress={() => {
              setReminder({ stopDate: todayKey() });
              close();
            }}
          />
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 24, padding: 24, gap: 10 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8, lineHeight: 28 },
  body: { fontSize: 14, lineHeight: 21, marginBottom: 8 },
});
