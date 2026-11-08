import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { POSTURE_META, PostureIcon } from '@/components/Legacy';
import { useMediaUrl } from '@/hooks/useMediaUrl';
import type { Posture } from '@/lib/types';

/** 영상 썸네일. 올린 썸네일이 없으면 자세 색 바탕 + 자세 아이콘 */
export function MediaThumb({ thumbnail, posture, iconSize = 40 }: { thumbnail?: string; posture: Posture; iconSize?: number }) {
  const { src } = useMediaUrl(thumbnail);
  return (
    <View style={[StyleSheet.absoluteFill, styles.box, { backgroundColor: POSTURE_META[posture].bg }]}>
      {src ? (
        <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <PostureIcon posture={posture} size={iconSize} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
