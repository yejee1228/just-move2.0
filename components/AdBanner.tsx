import React, { useEffect } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMediaUrl } from '@/hooks/useMediaUrl';
import type { AdVideo } from '@/lib/types';

/** 관리자 화면에서 권장하는 배너 이미지 비율 (가로:세로 = 6:1) */
const BANNER_ASPECT = 6;

/** 운동 영상 화면 아래에 붙는 배너 광고. 이미지를 불러온 뒤에 노출로 센다. 이미지가 없으면 아무것도 그리지 않는다 */
export function AdBanner({
  ad,
  onShown,
  onClick,
}: {
  ad: AdVideo;
  onShown: (id: string) => void;
  onClick: (id: string) => void;
}) {
  const { src, status } = useMediaUrl(ad.video);
  const ready = status === 'ready';

  useEffect(() => {
    if (ready) onShown(ad.id);
  }, [ready, ad.id, onShown]);

  if (!src) return null;

  return (
    <Pressable
      accessibilityRole={ad.linkUrl ? 'link' : 'image'}
      accessibilityLabel={`광고: ${ad.title}`}
      disabled={!ad.linkUrl}
      onPress={() => {
        onClick(ad.id);
        void Linking.openURL(ad.linkUrl!);
      }}
      style={({ pressed }) => [styles.banner, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>광고</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    maxWidth: 480,
    aspectRatio: BANNER_ASPECT,
    alignSelf: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E5EAEF',
  },
  badge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
