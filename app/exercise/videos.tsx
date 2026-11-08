import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { BottomBar, FlowHeader, POSTURE_ORDER, PostureIcon, useLegacyPad } from '@/components/Legacy';
import { MediaThumb } from '@/components/MediaThumb';
import { appConfig } from '@/lib/config';
import { formatCount, likeCountOf, rankVideos, videoScore } from '@/lib/recommend';
import { POSTURE_LABEL, type Exercise, type Posture } from '@/lib/types';
import { useStore } from '@/store/AppStore';

/**
 * M-01 운동 영상 바둑판 (모든 영상은 1분 이상)
 * 홈에서 자세를 누르면 ?posture=lying 처럼 그 자세로 열리고, 난이도와 상관없이 그 자세의 영상을 모두 보여 준다.
 * 체크박스로 최대 10개를 고르면 고른 순서대로만 연결 재생하고,
 * 체크 없이 영상을 누르면 그 영상부터 시작해 추천 영상이 뒤를 이어 최대 10개를 재생한다.
 * 순서는 시청 기록으로 정한 맞춤 순서 (lib/recommend.ts).
 */

type Filter = Posture | 'all';
const FILTERS: Filter[] = ['all', ...POSTURE_ORDER];
const MAX = appConfig.playlistMax;

const isFilter = (v: unknown): v is Filter =>
  v === 'all' || v === 'lying' || v === 'sitting' || v === 'standing' || v === 'walking';

/** 카드에 보이는 영상 길이. 목록에 길이를 적은 영상은 m:ss, 아니면 "1분+" (모든 영상은 1분 이상) */
function lengthLabel(ex: Exercise): string {
  if (!ex.durationSec) return '1분+';
  const s = Math.round(ex.durationSec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function VideosScreen() {
  const colors = useColors();
  const pad = useLegacyPad();
  const { catalog, settings, videoStats, startSession, startSelected, setLastPosture, toggleLike } = useStore();
  const params = useLocalSearchParams<{ posture?: string; t?: string }>();
  const [filter, setFilter] = useState<Filter>(
    isFilter(params.posture) ? params.posture : settings.lastPosture ?? 'all',
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [limitHit, setLimitHit] = useState(false);

  // 홈에서 자세를 눌러 들어올 때마다 그 자세로 맞춘다 (t: 같은 자세를 다시 눌러도 반영)
  useEffect(() => {
    if (isFilter(params.posture)) setFilter(params.posture);
  }, [params.posture, params.t]);

  const videos = useMemo(() => rankVideos(catalog, filter, videoStats), [catalog, filter, videoStats]);

  const chooseFilter = (f: Filter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(f);
    setLastPosture(f === 'all' ? null : f);
  };

  const play = (ex: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (startSession(ex.id, filter)) router.push('/exercise/play');
  };

  const toggleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!selected.includes(id) && selected.length >= MAX) {
      setLimitHit(true);
      return;
    }
    setLimitHit(false);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const playSelected = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (startSelected(selected)) {
      setSelected([]);
      setLimitHit(false);
      router.push('/exercise/play');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlowHeader title="운동 영상" onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: 16, paddingBottom: pad.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          영상을 누르면 바로 시작해요. 체크하면 고른 순서대로 최대 {MAX}개를 이어서 볼 수 있어요.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipsWrap}
        >
          {FILTERS.map((f) => {
            const on = filter === f;
            return (
              <Pressable
                key={f}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => chooseFilter(f)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? colors.primary : colors.card,
                    borderColor: on ? colors.primary : colors.border,
                  },
                ]}
              >
                {f !== 'all' ? <PostureIcon posture={f} size={16} color={on ? '#FFFFFF' : undefined} /> : null}
                <Text style={[styles.chipText, { color: on ? '#FFFFFF' : colors.text }]}>
                  {f === 'all' ? '전체' : POSTURE_LABEL[f]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.grid}>
          {videos.map((ex) => {
            const p = ex.postures[0];
            const stat = videoStats[ex.id];
            const order = selected.indexOf(ex.id) + 1;
            const liked = !!stat?.liked;
            return (
              <View key={ex.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.thumb}>
                  <MediaThumb thumbnail={ex.thumbnail} posture={p} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${ex.name}, 영상 재생`}
                    onPress={() => play(ex)}
                    style={StyleSheet.absoluteFill}
                  />

                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: order > 0 }}
                    accessibilityLabel={order > 0 ? `${ex.name}, 연결 재생 ${order}번째` : `${ex.name}, 연결 재생에 추가`}
                    onPress={() => toggleSelect(ex.id)}
                    hitSlop={8}
                    style={[
                      styles.check,
                      order > 0
                        ? { backgroundColor: colors.accent, borderColor: colors.accent }
                        : { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: colors.border },
                    ]}
                  >
                    {order > 0 ? <Text style={styles.checkNum}>{order}</Text> : null}
                  </Pressable>

                  <View style={[styles.pill, styles.pillTopRight]} pointerEvents="none">
                    <Text style={styles.pillText}>{lengthLabel(ex)}</Text>
                  </View>

                  <View style={[styles.pill, styles.pillBottomLeft]} pointerEvents="none">
                    <Ionicons name="eye-outline" size={13} color="#FFFFFF" />
                    <Text style={styles.pillText}>{formatCount(stat?.views ?? 0)}</Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: liked }}
                    accessibilityLabel={`${ex.name} 좋아요${liked ? ' 취소' : ''}, ${likeCountOf(stat)}개`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      toggleLike(ex.id);
                    }}
                    hitSlop={8}
                    style={[styles.pill, styles.pillBottomRight]}
                  >
                    <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? '#FF5A67' : '#FFFFFF'} />
                    <Text style={styles.pillText}>{formatCount(likeCountOf(stat))}</Text>
                  </Pressable>
                </View>

                <Pressable accessibilityElementsHidden onPress={() => play(ex)} style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                    {ex.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {filter === 'all' ? `${POSTURE_LABEL[p]} · ` : ''}
                      {ex.bodyPart}
                    </Text>
                    {videoScore(stat) > 0 ? (
                      <View style={[styles.pickBadge, { backgroundColor: colors.accent }]}>
                        <Text style={styles.pickBadgeText}>추천</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        {videos.length === 0 ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>이 자세의 영상을 준비 중이에요.</Text>
        ) : null}
      </ScrollView>

      {selected.length > 0 ? (
        <View>
          {limitHit ? (
            <Text style={[styles.limit, { color: colors.textSecondary, backgroundColor: colors.background }]}>
              연결 재생은 최대 {MAX}개까지 고를 수 있어요
            </Text>
          ) : null}
          <BottomBar>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSelected([]);
                setLimitHit(false);
              }}
              style={({ pressed }) => [styles.clearBtn, { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={[styles.clearText, { color: colors.primary }]}>선택 해제</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={playSelected}
              style={({ pressed }) => [styles.playBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="play" size={18} color="#FFFFFF" />
              <Text style={styles.playText}>{selected.length}개 연결 재생</Text>
            </Pressable>
          </BottomBar>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  chipsWrap: { marginHorizontal: -20, marginBottom: 16, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 20 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 40,
  },
  chipText: { fontSize: 14, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: { width: '48.5%', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  thumb: { aspectRatio: 1 },
  check: {
    position: 'absolute',
    left: 8,
    top: 8,
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkNum: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  pill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 7,
    minHeight: 26,
  },
  pillTopRight: { right: 8, top: 8 },
  pillBottomLeft: { left: 8, bottom: 8 },
  pillBottomRight: { right: 8, bottom: 8, minHeight: 32 },
  pillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  cardBody: { padding: 10, gap: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19, minHeight: 38 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  cardMeta: { fontSize: 12, flexShrink: 1 },
  pickBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  pickBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  limit: { fontSize: 13, fontWeight: '600', textAlign: 'center', paddingTop: 8 },
  clearBtn: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 2 },
  clearText: { fontSize: 15, fontWeight: '700' },
  playBtn: {
    flex: 1.6,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
  },
  playText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
