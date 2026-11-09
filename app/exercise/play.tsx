import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useWakeLock } from '@/hooks/useWakeLock';
import { BottomBar, FlowHeader } from '@/components/Legacy';
import VideoSurface from '@/components/VideoSurface';
import { AdBanner } from '@/components/AdBanner';
import { AdPlayer } from '@/components/AdPlayer';
import { useMediaUrl } from '@/hooks/useMediaUrl';
import { isAdLive } from '@/lib/adReport';
import { bannerForSlot, isBannerAd } from '@/lib/ads';
import { todayKey } from '@/lib/date';
import { exerciseById, targetText, videoSecOf } from '@/data/content';
import { appConfig } from '@/lib/config';
import { dropsToGrant, playsEarningDrop } from '@/lib/session';
import { dropsOnDate } from '@/lib/stats';
import { useStore } from '@/store/AppStore';
import type { AdVideo, InProgress } from '@/lib/types';

const SAVE_EVERY_MS = 5000;
const TICK_MS = 250;

function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function PlayScreen() {
  const colors = useColors();
  const { ready, inProgress, sessions, ads, saveProgress, finishSession, recordView, recordAdView, recordAdClick } = useStore();

  const curRef = useRef<InProgress | null>(inProgress);
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [position, setPosition] = useState(0); // 현재 영상 재생 위치(초)
  const [paused, setPaused] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const finishedRef = useRef(false);
  const lastTick = useRef(Date.now());
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [ad, setAd] = useState<AdVideo | null>(null); // 지금 재생 중인 광고
  const [lapKey, setLapKey] = useState(0); // 반복 재생으로 영상을 처음부터 다시 틀 때마다 늘어난다
  const adsRef = useRef(ads);
  adsRef.current = ads;

  // 새로고침 등으로 늦게 불러온 경우
  useEffect(() => {
    if (ready && !curRef.current) {
      curRef.current = inProgress;
      rerender();
    }
  }, [ready, inProgress]);

  useEffect(() => {
    if (ready && !inProgress && !curRef.current && !finishedRef.current) {
      router.replace('/(tabs)');
    }
  }, [ready, inProgress]);

  const cur = curRef.current;
  const exercise = cur ? exerciseById(cur.playlist[cur.slotIndex]) : undefined;
  // 영상 길이: 파일에서 확인한 실제 길이 → 목록에 적힌 길이 → 기본 1분
  const videoLen = (cur && cur.slotVideoSec?.[cur.slotIndex]) || videoSecOf(exercise);
  const media = useMediaUrl(exercise?.video);
  const active = !paused && !ad && (failed || videoActive);
  const activeRef = useRef(active);
  activeRef.current = active;
  useWakeLock(!!cur && !paused);

  const persist = useCallback(() => {
    const c = curRef.current;
    if (!c || finishedRef.current) return;
    saveProgress({ ...c, slotPlayedSec: [...c.slotPlayedSec] });
  }, [saveProgress]);

  const finish = useCallback(() => {
    const c = curRef.current;
    if (!c || finishedRef.current) return;
    finishedRef.current = true;
    const session = finishSession({ ...c, slotPlayedSec: [...c.slotPlayedSec] });
    router.replace({ pathname: '/exercise/complete', params: { id: session.id } });
  }, [finishSession]);

  const goToSlot = useCallback(
    (index: number) => {
      const c = curRef.current;
      if (!c) return;
      curRef.current = { ...c, slotIndex: index };
      setPosition(0);
      setFailed(false);
      setVideoActive(false);
      persist();
      rerender();
    },
    [persist],
  );

  const advance = useCallback(() => {
    const c = curRef.current;
    if (!c || finishedRef.current) return;
    if (c.slotIndex >= c.playlist.length - 1) {
      finish();
      return;
    }
    // 계획된 자리면 다음 영상으로 넘어가기 전에 광고를 한 번 보여 준다
    const adId = c.adPlan?.[c.slotIndex];
    const nextAd =
      adId && !c.adsShown?.includes(c.slotIndex) ? adsRef.current.find((a) => a.id === adId && isAdLive(a, todayKey())) : undefined;
    if (nextAd) {
      curRef.current = { ...c, adsShown: [...(c.adsShown ?? []), c.slotIndex] };
      setVideoActive(false);
      persist();
      setAd(nextAd);
      return;
    }
    goToSlot(c.slotIndex + 1);
  }, [finish, goToSlot, persist]);

  // 영상이 끝났을 때: 반복 횟수가 남았으면 처음부터 다시, 아니면 다음 영상으로
  const onPlayEnded = useCallback(() => {
    const c = curRef.current;
    if (!c || finishedRef.current) return;
    const i = c.slotIndex;
    const laps = c.slotLaps?.[i] ?? [];
    if (laps.length + 1 >= (c.slotRepeats?.[i] ?? 1)) {
      advance();
      return;
    }
    const lapSec = (c.slotPlayedSec[i] ?? 0) - laps.reduce((a, b) => a + b, 0);
    const slotLaps = c.playlist.map((_, n) => c.slotLaps?.[n] ?? []);
    slotLaps[i] = [...laps, lapSec];
    curRef.current = { ...c, slotLaps };
    setPosition(0);
    setVideoActive(false);
    setLapKey((k) => k + 1);
    persist();
  }, [advance, persist]);

  const changeRepeat = (delta: number) => {
    const c = curRef.current;
    if (!c) return;
    const slotRepeats = c.playlist.map((_, n) => c.slotRepeats?.[n] ?? 1);
    slotRepeats[c.slotIndex] = Math.min(appConfig.repeatMax, Math.max(1, slotRepeats[c.slotIndex] + delta));
    curRef.current = { ...c, slotRepeats };
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    persist();
    rerender();
  };

  const endAd = useCallback(() => {
    const c = curRef.current;
    setAd(null);
    if (c) goToSlot(c.slotIndex + 1);
  }, [goToSlot]);

  // 조회수: 슬롯마다 재생을 시작할 때 한 번만 센다
  const viewedKey = useRef<string | null>(null);
  const slotKey = cur && exercise ? `${cur.id}:${cur.slotIndex}` : null;
  useEffect(() => {
    if (!slotKey || !exercise || viewedKey.current === slotKey) return;
    viewedKey.current = slotKey;
    recordView(exercise.id);
  }, [slotKey, exercise, recordView]);

  // 관리자가 삭제한 영상이 목록에 남아 있으면 건너뛴다
  useEffect(() => {
    if (cur && !exercise) advance();
  }, [cur, exercise, advance]);

  // 재생 시간 측정: 영상이 실제로 재생 중일 때만 쌓는다
  useEffect(() => {
    lastTick.current = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTick.current) / 1000;
      lastTick.current = now;
      const c = curRef.current;
      if (!c || !activeRef.current || finishedRef.current) return;
      c.slotPlayedSec[c.slotIndex] = (c.slotPlayedSec[c.slotIndex] ?? 0) + dt;
      setPosition((p) => p + dt);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // 임시 재생 모드는 영상 길이만큼 흐르면 다음으로
  useEffect(() => {
    if (failed && position >= videoLen) onPlayEnded();
  }, [failed, position, videoLen, onPlayEnded]);

  const onDuration = useCallback((sec: number) => {
    const c = curRef.current;
    if (!c) return;
    const lens = c.slotVideoSec ? [...c.slotVideoSec] : c.playlist.map(() => null);
    if (lens[c.slotIndex] === sec) return;
    lens[c.slotIndex] = sec;
    curRef.current = { ...c, slotVideoSec: lens };
    rerender();
  }, []);

  // 중간 저장 + 화면을 떠날 때 저장
  useEffect(() => {
    const timer = setInterval(persist, SAVE_EVERY_MS);
    return () => {
      clearInterval(timer);
      persist();
    };
  }, [persist]);

  // 탭이 숨겨지면 일시정지
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        setPaused(true);
        persist();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [persist]);

  const onPrev = () => {
    if (!cur || cur.slotIndex === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToSlot(cur.slotIndex - 1);
  };

  const onNext = () => {
    if (!cur) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    advance();
  };

  const failedRef = useRef(false);
  failedRef.current = failed;
  const onBlocked = useCallback(() => {
    if (!failedRef.current) setPaused(true);
  }, []);
  const onFail = useCallback(() => {
    failedRef.current = true;
    setFailed(true);
    setPaused(false);
  }, []);

  useEffect(() => {
    if (media.status === 'missing') onFail();
  }, [media.status, exercise?.id, onFail]);

  if (ad) return <AdPlayer ad={ad} onShown={recordAdView} onClick={recordAdClick} onDone={endAd} />;

  if (!cur || !exercise) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  const remaining = videoLen - position;
  const today = todayKey();
  const target = targetText(exercise);
  const repeatCount = cur.slotRepeats?.[cur.slotIndex] ?? 1;
  // 지금 보고 있는 회차를 포함한 남은 재생 횟수
  const repeatsLeft = Math.max(1, repeatCount - (cur.slotLaps?.[cur.slotIndex]?.length ?? 0));
  const banner = bannerForSlot(ads.filter((a) => isBannerAd(a) && isAdLive(a, today)), cur.id, cur.slotIndex);
  // 1분 이상 본 재생 1회에 물방울 1개 (하루 최대 dropDailyLimit개)
  const dropsNow = dropsToGrant(
    playsEarningDrop(cur.slotPlayedSec, cur.slotLaps),
    dropsOnDate(sessions, cur.localDate),
    appConfig.dropDailyLimit,
  );
  const portrait = exercise.orientation === 'portrait';
  const ratio = portrait ? 9 / 16 : 16 / 9;
  const boxSize = (() => {
    if (!area) return { width: 0, height: 0 };
    const maxW = Math.max(0, area.w);
    const maxH = Math.max(0, area.h);
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    return { width: Math.floor(w), height: Math.floor(h) };
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 수정 전 영상 화면과 같은 네이비 머리 */}
      <FlowHeader
        dark
        title={exercise.name}
        onBack={() => {
          persist();
          router.replace('/(tabs)');
        }}
        right={
          <Text style={styles.headerCount}>
            {cur.slotIndex + 1}/{cur.playlist.length}
          </Text>
        }
      />

      {/* 영상 영역 */}
      <View
        style={styles.videoArea}
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? '재생' : '일시정지'}
          onPress={() => {
            setPaused((p) => !p);
            persist();
          }}
          style={[styles.videoBox, boxSize]}
        >
          {!failed ? (
            media.src ? <VideoSurface
              key={lapKey}
              src={media.src}
              playing={!paused}
              onActiveChange={setVideoActive}
              onEnded={onPlayEnded}
              onFail={onFail}
              onBlocked={onBlocked}
              onDuration={onDuration}
            /> : null
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="play-circle-outline" size={48} color="#FFFFFF" />
              <Text style={styles.phTitle}>{exercise.name}</Text>
              <Text style={styles.phDesc}>{exercise.description}</Text>
              <Text style={styles.phNote}>영상 파일을 준비 중이에요 (임시 재생)</Text>
            </View>
          )}
          {paused ? (
            <View style={styles.pauseOverlay}>
              <Ionicons name="play-circle" size={72} color="#FFFFFF" />
              <Text style={styles.pauseText}>탭해서 이어서 하기</Text>
            </View>
          ) : null}
        </Pressable>

        {/* 반복 재생: 이 영상을 몇 번 볼지 */}
        <View style={styles.repeatBox}>
          <Text style={styles.repeatLabel}>반복재생 횟수</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="반복재생 횟수 줄이기"
            accessibilityState={{ disabled: repeatCount <= 1 }}
            disabled={repeatCount <= 1}
            hitSlop={6}
            onPress={() => changeRepeat(-1)}
            style={[styles.repeatBtn, { opacity: repeatCount <= 1 ? 0.35 : 1 }]}
          >
            <Ionicons name="remove" size={14} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.repeatCount} accessibilityLabel={`반복재생 ${repeatCount}번`}>
            {repeatCount}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="반복재생 횟수 늘리기"
            accessibilityState={{ disabled: repeatCount >= appConfig.repeatMax }}
            disabled={repeatCount >= appConfig.repeatMax}
            hitSlop={6}
            onPress={() => changeRepeat(1)}
            style={[styles.repeatBtn, { opacity: repeatCount >= appConfig.repeatMax ? 0.35 : 1 }]}
          >
            <Ionicons name="add" size={14} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(100, (position / videoLen) * 100)}%`, backgroundColor: colors.accent },
          ]}
        />
      </View>

      {/* 정보 영역: 남은 횟수 / 남은 시간 / 모은 물방울 줄 + 안내 상자 */}
      <View style={styles.infoArea}>
        <View style={[styles.goalRow, target ? styles.goalRowTight : null, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {target ? (
            <>
              <View style={styles.goalItem}>
                <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>목표</Text>
                <Text style={[styles.goalValue, styles.goalValueSmall, { color: colors.text }]} numberOfLines={1}>
                  {target}
                </Text>
              </View>
              <View style={[styles.goalDivider, { backgroundColor: colors.border }]} />
            </>
          ) : null}
          <View style={styles.goalItem}>
            <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>남은 횟수</Text>
            <Text style={[styles.goalValue, { color: colors.text }]}>{repeatsLeft}회</Text>
          </View>
          <View style={[styles.goalDivider, { backgroundColor: colors.border }]} />
          <View style={styles.goalItem}>
            <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>남은 시간</Text>
            <Text style={[styles.goalValue, { color: colors.text }]}>{fmt(remaining)}</Text>
          </View>
          <View style={[styles.goalDivider, { backgroundColor: colors.border }]} />
          <View style={styles.goalItem}>
            <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>모은 물방울</Text>
            <Text style={[styles.goalValue, { color: '#3B9AE1' }]} numberOfLines={1}>
              +{dropsNow}
            </Text>
          </View>
        </View>

        {exercise.carOk ? (
          <View style={styles.carBadge}>
            <Ionicons name="car-outline" size={16} color="#B45309" />
            <Text style={styles.carText}>차 안에서는 주차 중일 때만 해주세요</Text>
          </View>
        ) : null}

        <View style={[styles.tipBox, { backgroundColor: colors.muted }]}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            끝까지 하지 않아도 괜찮아요. 움직인 만큼 기록할 수 있어요.
            {exercise.caution ? `\n주의: ${exercise.caution}` : ''}
          </Text>
        </View>
        <Text style={[styles.safety, { color: colors.text }]}>통증이나 어지러움이 느껴지면 즉시 멈춰주세요</Text>

        {banner ? (
          <AdBanner
            key={`${slotKey}:${banner.id}`}
            ad={banner}
            onShown={recordAdView}
            onClick={(id) => {
              setPaused(true);
              persist();
              recordAdClick(id);
            }}
          />
        ) : null}

        {__DEV__ && failed ? (
          <Pressable
            onPress={() => {
              const c = curRef.current;
              if (!c) return;
              c.slotPlayedSec[c.slotIndex] = (c.slotPlayedSec[c.slotIndex] ?? 0) + 10;
              setPosition((p) => p + 10);
            }}
            style={styles.devBtn}
          >
            <Text style={[styles.devText, { color: colors.mutedForeground }]}>+10초 (개발용)</Text>
          </Pressable>
        ) : null}
      </View>

      {/* 하단 바: 이전 영상 / 그만하기 / 다음 영상 (그리드 순서대로) */}
      <BottomBar>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이전 영상"
          onPress={onPrev}
          disabled={cur.slotIndex === 0}
          style={({ pressed }) => [
            styles.sideBtn,
            { borderColor: colors.primary, opacity: cur.slotIndex === 0 ? 0.3 : pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="play-skip-back" size={18} color={colors.primary} />
          <Text style={[styles.sideBtnText, { color: colors.primary }]}>이전 영상</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="그만하기"
          onPress={finish}
          style={({ pressed }) => [
            styles.doneBtn,
            { backgroundColor: colors.success, shadowColor: colors.success, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.doneBtnText}>그만하기</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음 영상"
          onPress={onNext}
          style={({ pressed }) => [styles.sideBtn, { borderColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="play-skip-forward" size={18} color={colors.primary} />
          <Text style={[styles.sideBtnText, { color: colors.primary }]}>다음 영상</Text>
        </Pressable>
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCount: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  videoArea: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  videoBox: { backgroundColor: '#000', overflow: 'hidden' },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
    backgroundColor: '#000',
  },
  phTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  phDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' },
  phNote: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pauseText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  repeatBox: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 3,
  },
  repeatLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginRight: 2 },
  repeatBtn: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  repeatCount: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', minWidth: 16, textAlign: 'center' },
  progressTrack: { height: 4 },
  progressFill: { height: 4 },
  infoArea: { padding: 20, gap: 12 },
  goalRow: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center' },
  goalRowTight: { paddingHorizontal: 8 },
  goalItem: { flex: 1, alignItems: 'center' },
  goalLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  goalValue: { fontSize: 16, fontWeight: '700' },
  goalValueSmall: { fontSize: 13, lineHeight: 20 },
  goalDivider: { width: 1, height: 32 },
  carBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF5E7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  carText: { color: '#B45309', fontSize: 13, fontWeight: '700' },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 8, padding: 12 },
  tipText: { fontSize: 12, flex: 1, lineHeight: 18 },
  safety: { fontSize: 13, fontWeight: '600' },
  devBtn: { alignSelf: 'center', padding: 4 },
  devText: { fontSize: 12 },
  sideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: 14,
  },
  sideBtnText: { fontSize: 13, fontWeight: '700' },
  doneBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  doneBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
});
