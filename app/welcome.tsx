import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Button, useScreenPad } from '@/components/ui';
import { Crop } from '@/components/Crop';
import { useStore } from '@/store/AppStore';
import type { WelcomeMessage } from '@/lib/messages';

/**
 * 재시작 환영 화면.
 * 쉰 날 수·재시작 횟수·연속 기록은 보여 주지 않고, 작물은 쉬기 전 모습 그대로 보여 준다.
 */
export default function WelcomeScreen() {
  const colors = useColors();
  const pad = useScreenPad();
  const { ready, farm, inProgress, getWelcome, markWelcomeShown } = useStore();
  const [message, setMessage] = useState<WelcomeMessage | null>(null);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    if (!ready || decided) return;
    setDecided(true);
    const m = getWelcome();
    if (m) {
      setMessage(m);
      markWelcomeShown(m.id);
    } else {
      router.replace('/(tabs)');
    }
  }, [ready, decided, getWelcome, markWelcomeShown]);

  if (!message) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.center, { paddingTop: pad.top + 48 }]}>
        <Crop stage={farm.cropProgress} size={168} />
        <Text style={[styles.text, { color: colors.text }]}>{message.text}</Text>
      </View>
      <View style={[styles.bottom, { paddingBottom: pad.bottom + 20 }]}>
        <Button
          label="바로 1분 하기"
          variant="accent"
          onPress={() => router.replace('/exercise/videos')}
          style={{ minHeight: 60 }}
        />
        {inProgress ? (
          <Button label="이어서 하기" variant="outline" onPress={() => router.replace('/exercise/play')} />
        ) : null}
        <Button label="홈으로 가기" variant="ghost" onPress={() => router.replace('/(tabs)')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 28, gap: 24 },
  text: { fontSize: 24, fontWeight: '800', textAlign: 'center', lineHeight: 34 },
  bottom: { paddingHorizontal: 20, gap: 10 },
});
