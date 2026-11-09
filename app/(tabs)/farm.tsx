import React, { useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { Button, useScreenPad } from '@/components/ui';
import { Crop, Tomato } from '@/components/Crop';
import { TipArt } from '@/components/TipArt';
import { TIP_CARDS, type TipCard } from '@/data/content';
import { appConfig } from '@/lib/config';
import { useStore } from '@/store/AppStore';

const TIP_TYPE_LABEL: Record<TipCard['type'], string> = { recipe: '레시피', health: '건강 팁' };

export default function FarmScreen() {
  const colors = useColors();
  const pad = useScreenPad();
  const { farm, waterCrop } = useStore();
  const [harvestTip, setHarvestTip] = useState<TipCard | 'none' | null>(null);
  const [openTip, setOpenTip] = useState<TipCard | null>(null);
  const bounce = useRef(new Animated.Value(0)).current;

  const water = () => {
    const result = waterCrop();
    if (!result.watered) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.spring(bounce, { toValue: 0, friction: 4, useNativeDriver: true }),
    ]).start();
    if (result.harvested) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHarvestTip(TIP_CARDS.find((t) => t.id === result.unlockedTipId) ?? 'none');
    }
  };

  const unlocked = farm.unlockedTipIds
    .map((id) => TIP_CARDS.find((t) => t.id === id))
    .filter((t): t is TipCard => !!t)
    .reverse();
  const canWater = farm.drops > 0;
  const scale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: pad.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.primary }]}>나의 농장</Text>

        <View style={[styles.field, { backgroundColor: '#EAF5EC', borderColor: colors.border }]}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Crop stage={farm.cropProgress} size={190} />
          </Animated.View>
          <Text style={[styles.progress, { color: colors.text }]}>
            물방울 {farm.cropProgress}/{appConfig.dropsPerHarvest}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${(farm.cropProgress / appConfig.dropsPerHarvest) * 100}%`,
                  backgroundColor: '#3B9AE1',
                },
              ]}
            />
          </View>
        </View>

        <View style={[styles.dropRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="water" size={28} color="#3B9AE1" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.dropTitle, { color: colors.text }]}>보유 물방울 {farm.drops}개</Text>
            {!canWater ? (
              <Text style={[styles.sub, { color: colors.textSecondary }]}>
                운동하면 물방울을 받아요
              </Text>
            ) : null}
          </View>
        </View>

        {canWater ? (
          <Button label="물주기" icon="water" onPress={water} style={styles.waterBtn} />
        ) : (
          <Button label="운동하러 가기" variant="accent" onPress={() => router.push('/exercise/videos')} />
        )}

        <Text style={[styles.section, { color: colors.text }]}>작물 바구니</Text>
        <View style={[styles.basket, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {farm.harvestCount === 0 ? (
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              물방울 {appConfig.dropsPerHarvest}개를 주면 방울토마토를 수확해요
            </Text>
          ) : (
            <>
              <View style={styles.tomatoes}>
                {Array.from({ length: Math.min(farm.harvestCount, 12) }, (_, i) => (
                  <Tomato key={i} size={32} />
                ))}
              </View>
              <Text style={[styles.dropTitle, { color: colors.text }]}>
                방울토마토 {farm.harvestCount}개
              </Text>
            </>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="상점 가기"
          onPress={() => router.push('/shop')}
          style={({ pressed }) => [styles.shopLink, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="storefront-outline" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: colors.text }]}>상점</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>방울토마토로 실제 상품을 구입해요</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </Pressable>

        <Text style={[styles.section, { color: colors.text }]}>팁 카드</Text>
        {unlocked.length === 0 ? (
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            수확할 때마다 레시피나 건강 팁 카드가 하나씩 열려요
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {unlocked.map((t) => (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityLabel={`${t.title} 팁 카드 열기`}
                onPress={() => setOpenTip(t)}
                style={[styles.tip, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.tipBadge, { backgroundColor: t.type === 'recipe' ? '#FDEBD2' : '#E1F1FB' }]}>
                  <Text style={[styles.tipBadgeText, { color: colors.text }]}>{TIP_TYPE_LABEL[t.type]}</Text>
                </View>
                <Text style={[styles.tipTitle, { color: colors.text }]} numberOfLines={1}>
                  {t.title}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={harvestTip !== null} transparent animationType="fade" onRequestClose={() => setHarvestTip(null)}>
        <View style={styles.modalBack}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <View style={{ alignSelf: 'center' }}>
              <Tomato size={72} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>방울토마토를 수확했어요!</Text>
            {harvestTip && harvestTip !== 'none' ? (
              <View style={[styles.newTip, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>새 팁 카드가 열렸어요</Text>
                <Text style={[styles.tipTitle, { color: colors.text }]}>{harvestTip.title}</Text>
              </View>
            ) : null}
            <Text style={[styles.sub, { color: colors.textSecondary }]}>새 작물을 심었어요</Text>
            {harvestTip && harvestTip !== 'none' ? (
              <Button
                label="팁 카드 보기"
                variant="accent"
                onPress={() => {
                  setOpenTip(harvestTip);
                  setHarvestTip(null);
                }}
              />
            ) : null}
            <Button label="닫기" variant="outline" onPress={() => setHarvestTip(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={openTip !== null} transparent animationType="fade" onRequestClose={() => setOpenTip(null)}>
        <View style={styles.modalBack}>
          <Pressable accessibilityLabel="팁 카드 닫기" onPress={() => setOpenTip(null)} style={StyleSheet.absoluteFill} />
          {openTip ? (
            <View style={[styles.tipModal, { backgroundColor: colors.card }]}>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                <View style={styles.tipArt} accessibilityRole="image" accessibilityLabel={`${openTip.title} 그림`}>
                  <TipArt tip={openTip} />
                </View>
                <View style={styles.tipContent}>
                  <View
                    style={[
                      styles.tipBadge,
                      styles.tipModalBadge,
                      { backgroundColor: openTip.type === 'recipe' ? '#FDEBD2' : '#E1F1FB' },
                    ]}
                  >
                    <Text style={[styles.tipBadgeText, { color: colors.text }]}>{TIP_TYPE_LABEL[openTip.type]}</Text>
                  </View>
                  <Text style={[styles.tipModalTitle, { color: colors.text }]}>{openTip.title}</Text>
                  <Text style={[styles.body, { color: colors.text }]}>{openTip.body}</Text>
                  <Button label="닫기" variant="outline" onPress={() => setOpenTip(null)} style={styles.tipClose} />
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: '800' },
  field: { borderWidth: 1, borderRadius: 24, alignItems: 'center', paddingVertical: 24, gap: 10 },
  progress: { fontSize: 18, fontWeight: '800' },
  track: { width: '60%', height: 8, borderRadius: 4, backgroundColor: '#CFE3D3' },
  fill: { height: 8, borderRadius: 4 },
  dropRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 16 },
  dropTitle: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 14, lineHeight: 20 },
  waterBtn: { minHeight: 60, backgroundColor: '#3B9AE1' },
  section: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  basket: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  tomatoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  shopLink: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 16 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14 },
  tipBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tipBadgeText: { fontSize: 12, fontWeight: '700' },
  tipTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 24, padding: 24, alignItems: 'stretch', gap: 12 },
  modalTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  newTip: { borderRadius: 14, padding: 14, gap: 4 },
  tipModal: { width: '100%', maxWidth: 400, maxHeight: '90%', alignSelf: 'center', borderRadius: 24, overflow: 'hidden' },
  tipArt: { width: '100%', aspectRatio: 16 / 9 },
  tipContent: { padding: 22, gap: 10 },
  tipModalBadge: { alignSelf: 'flex-start' },
  tipModalTitle: { fontSize: 22, fontWeight: '800', lineHeight: 30 },
  tipClose: { marginTop: 8 },
  body: { fontSize: 16, lineHeight: 25 },
});
