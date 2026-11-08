import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { POSTURE_META, POSTURE_ORDER, PostureIcon, useLegacyPad } from '@/components/Legacy';
import { DAILY_PHRASES } from '@/data/content';
import { appConfig } from '@/lib/config';
import { kstHour, timeBandOf, todayKey } from '@/lib/date';
import { nextReminderLabel } from '@/lib/reminder';
import { dropsOnDate, rangeSummary } from '@/lib/stats';
import { POSTURE_LABEL, type Posture } from '@/lib/types';
import { useStore } from '@/store/AppStore';

/**
 * H-01 홈 — 할 일 하나만 보여 준다.
 * 머리(로고 + 알림 버튼) → 움직이기 카드: 오늘의 한마디 → 자세 버튼 2×2 → [멈춘 운동 이어서 하기] → 오늘 상태 한 줄.
 * 수정 전 움직이기 카드와 같은 구성이고, 배경만 밝게 바꿨다. 자세를 누르면 그 자세의 운동 영상 바둑판(M-01)으로 간다.
 */

function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function HomeScreen() {
  const colors = useColors();
  const pad = useLegacyPad();
  const { ready, sessions, settings, inProgress, getWelcome, setLastPosture } = useStore();
  const [checked, setChecked] = useState(false);

  // 하루 이상 쉬고 돌아왔다면 홈보다 먼저 환영 화면
  useEffect(() => {
    if (!ready || checked) return;
    setChecked(true);
    if (getWelcome()) router.replace('/welcome');
  }, [ready, checked, getWelcome]);

  const today = todayKey();
  const phrase = useMemo(() => {
    const band = timeBandOf(kstHour());
    const list = DAILY_PHRASES.filter((p) => p.band === band);
    return list.length ? list[hashOf(today + band) % list.length].text : '지금 1분만 움직여 볼까요?';
  }, [today]);

  if (!ready || !checked) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const todaySum = rangeSummary(sessions, today, today);
  const dropsToday = dropsOnDate(sessions, today);
  const notifLabel = nextReminderLabel(settings, Date.now(), dropsToday, appConfig.dropDailyLimit);
  const notifOn = settings.notification.enabled;

  const choosePosture = (p: Posture) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLastPosture(p);
    router.push({ pathname: '/exercise/videos', params: { posture: p } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: pad.top + 16, paddingBottom: pad.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 머리: 로고 + 알림 버튼 */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.logo, { color: colors.primary }]}>JUST MOVE</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>생각은 그만, 일단 움직여요.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={notifOn ? `알림 설정, 다음 알림 ${notifLabel}` : '알림 설정, 알림 꺼짐'}
            onPress={() => router.push('/my/notifications')}
            style={({ pressed }) => [
              styles.bell,
              {
                backgroundColor: notifOn ? colors.card : colors.secondary,
                borderColor: notifOn ? colors.border : colors.secondary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons
              name={notifOn ? 'notifications' : 'notifications-off-outline'}
              size={18}
              color={notifOn ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.bellText, { color: notifOn ? colors.text : colors.textSecondary }]}>
              {notifOn ? `${notifLabel} 알림` : '알림 꺼짐'}
            </Text>
          </Pressable>
        </View>

        {/* 움직이기 카드 */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heroPhrase, { color: colors.primary }]}>{phrase}</Text>
          <Text style={[styles.heroGuide, { color: colors.textSecondary }]}>
            지금 자세를 고르고 꼼지락을 시작해요
          </Text>

          <View style={styles.postureGrid}>
            {POSTURE_ORDER.map((p) => {
              const m = POSTURE_META[p];
              const last = settings.lastPosture === p;
              return (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  accessibilityLabel={`${POSTURE_LABEL[p]} 운동 영상 보기`}
                  onPress={() => choosePosture(p)}
                  style={({ pressed }) => [
                    styles.postureBtn,
                    {
                      backgroundColor: m.bg,
                      borderColor: last ? colors.accent : 'transparent',
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                >
                  <View style={[styles.postureIcon, { backgroundColor: colors.card }]}>
                    <PostureIcon posture={p} size={28} />
                  </View>
                  <Text style={[styles.postureText, { color: colors.text }]}>{POSTURE_LABEL[p]}</Text>
                  {last ? <Text style={[styles.postureLast, { color: colors.accent }]}>지난번</Text> : null}
                </Pressable>
              );
            })}
          </View>

          {inProgress ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/exercise/play')}
              style={({ pressed }) => [styles.resumeBtn, { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="play-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.resumeText, { color: colors.primary }]}>멈춘 운동 이어서 하기</Text>
            </Pressable>
          ) : null}

          <Text style={[styles.heroStatus, { color: colors.textSecondary }]}>
            {todaySum.minutes > 0
              ? `오늘 ${todaySum.minutes}분 움직였어요 · 물방울 ${dropsToday}/${appConfig.dropDailyLimit}`
              : `오늘의 첫 1분을 시작해 볼까요? · 물방울 ${dropsToday}/${appConfig.dropDailyLimit}`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  logo: { fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  tagline: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  bell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  bellText: { fontSize: 12, fontWeight: '700' },
  hero: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  heroPhrase: { fontSize: 20, fontWeight: '800', lineHeight: 28 },
  heroGuide: { fontSize: 13, marginTop: -4 },
  postureGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 4 },
  postureBtn: {
    width: '48.5%',
    aspectRatio: 1.25,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 2,
  },
  postureIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  postureText: { fontSize: 17, fontWeight: '800' },
  postureLast: { position: 'absolute', top: 8, right: 10, fontSize: 11, fontWeight: '800' },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 10,
  },
  resumeText: { fontSize: 14, fontWeight: '700' },
  heroStatus: { fontSize: 12, textAlign: 'center' },
});
