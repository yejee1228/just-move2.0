import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLegacyPad } from '@/components/Legacy';
import VideoSurface from '@/components/VideoSurface';
import { useMediaUrl } from '@/hooks/useMediaUrl';
import type { AdVideo } from '@/lib/types';

const TICK_MS = 250;

/** 영상과 영상 사이의 광고. 시청 시간·물방울에는 포함하지 않는다. 재생할 수 없으면 바로 다음 영상으로 넘어간다 */
export function AdPlayer({
  ad,
  onShown,
  onClick,
  onDone,
}: {
  ad: AdVideo;
  onShown: (id: string) => void;
  onClick: (id: string) => void;
  onDone: () => void;
}) {
  const pad = useLegacyPad();
  const { src, status } = useMediaUrl(ad.video);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    onShown(ad.id);
  }, [ad.id, onShown]);

  useEffect(() => {
    if (status === 'missing' || status === 'none') finish();
  }, [status, finish]);

  useEffect(() => {
    if (!active || paused) return;
    const timer = setInterval(() => setElapsed((e) => e + TICK_MS / 1000), TICK_MS);
    return () => clearInterval(timer);
  }, [active, paused]);

  const onBlocked = useCallback(() => setPaused(true), []);
  const skipAfter = ad.skipAfterSec;
  const canSkip = skipAfter !== null && elapsed >= skipAfter;

  return (
    <View style={styles.container}>
      <View style={[styles.top, { paddingTop: pad.top + 12 }]}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>광고</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {ad.title}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={paused ? '광고 재생' : '광고 일시정지'}
        onPress={() => setPaused((p) => !p)}
        style={styles.video}
      >
        {src ? (
          <VideoSurface
            src={src}
            playing={!paused}
            onActiveChange={setActive}
            onEnded={finish}
            onFail={finish}
            onBlocked={onBlocked}
          />
        ) : null}
        {paused ? (
          <View style={styles.pause}>
            <Ionicons name="play-circle" size={72} color="#FFFFFF" />
          </View>
        ) : null}
      </Pressable>

      <View style={[styles.bottom, { paddingBottom: pad.bottom + 16 }]}>
        {ad.linkUrl ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              setPaused(true);
              onClick(ad.id);
              void Linking.openURL(ad.linkUrl!);
            }}
            style={({ pressed }) => [styles.link, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.linkText}>자세히 보기</Text>
            <Ionicons name="open-outline" size={16} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {skipAfter !== null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSkip }}
            disabled={!canSkip}
            onPress={finish}
            style={[styles.skip, { opacity: canSkip ? 1 : 0.6 }]}
          >
            <Text style={styles.skipText}>{canSkip ? '건너뛰기' : `${Math.ceil(skipAfter - elapsed)}초 후 건너뛰기`}</Text>
            {canSkip ? <Ionicons name="play-skip-forward" size={16} color="#FFFFFF" /> : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  badge: { backgroundColor: '#F5A623', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  video: { flex: 1 },
  pause: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  link: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  linkText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  skip: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  skipText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
