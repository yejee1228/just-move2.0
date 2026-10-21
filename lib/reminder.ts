import { dateKey, kstHour } from '@/lib/date';
import type { AppSettings } from '@/lib/types';

/**
 * 지금 알림을 보내야 하는지 판단한다.
 * - 켜져 있고, 시작~종료 시간 안의 정각 직후 2분 이내이며(기본 오전 9시~오후 8시 매시 정각)
 * - 오늘 물방울 한도를 다 채우지 않았고, '오늘은 그만'이나 미루기 중이 아니고
 * - 같은 시각에 이미 보내지 않았을 때
 * 반환값은 이번 시각을 나타내는 키(중복 발송 방지용). 보낼 필요가 없으면 null.
 */
export function reminderDueKey(
  settings: AppSettings,
  now: number,
  dropsToday: number,
  dropLimit: number,
): string | null {
  const n = settings.notification;
  if (!n.enabled) return null;
  const hour = kstHour(now);
  if (hour < n.startHour || hour > n.endHour) return null;
  // 정각 직후(2분 안)에만 보낸다. 앱을 중간에 연 순간 바로 알림이 뜨지 않게 한다
  const minute = new Date(now + 9 * 60 * 60 * 1000).getUTCMinutes();
  if (minute >= 2) return null;
  if (dropsToday >= dropLimit) return null;
  const today = dateKey(now);
  if (settings.reminder.stopDate === today) return null;
  if (settings.reminder.snoozeUntil && now < settings.reminder.snoozeUntil) return null;
  const key = `${today}T${String(hour).padStart(2, '0')}`;
  return settings.reminder.lastFiredKey === key ? null : key;
}

/**
 * 홈 알림 버튼에 보여 줄 다음 알림 안내.
 * '꺼짐' / '14시' / '내일 9시' (물방울을 다 모았거나 '오늘은 그만'이면 내일)
 */
export function nextReminderLabel(
  settings: AppSettings,
  now: number,
  dropsToday: number,
  dropLimit: number,
): string {
  const n = settings.notification;
  if (!n.enabled) return '꺼짐';
  const today = dateKey(now);
  const tomorrow = `내일 ${n.startHour}시`;
  if (dropsToday >= dropLimit || settings.reminder.stopDate === today) return tomorrow;
  let next = Math.max(kstHour(now) + 1, n.startHour);
  if (settings.reminder.snoozeUntil && now < settings.reminder.snoozeUntil) {
    next = Math.max(next, kstHour(settings.reminder.snoozeUntil) + (new Date(settings.reminder.snoozeUntil).getUTCMinutes() > 0 ? 1 : 0));
  }
  return next > n.endHour ? tomorrow : `${next}시`;
}
