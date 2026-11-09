import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tomato } from '@/components/Crop';
import { FlowHeader, useLegacyPad } from '@/components/Legacy';
import { Button } from '@/components/ui';
import { SHOP_PRODUCTS, type ShopProduct } from '@/data/content';
import { useColors } from '@/hooks/useColors';
import { useStore } from '@/store/AppStore';

/**
 * F-02 상점 (샘플). 방울토마토로 실제 상품을 구입하는 화면의 모양만 먼저 만들었다.
 * 주문·배송·차감은 아직 없어서 [구매하기]를 눌러도 방울토마토가 줄지 않는다.
 */

function ProductArt({ art }: { art: ShopProduct['art'] }) {
  if (art === 'water') {
    return (
      <View style={[styles.art, { backgroundColor: '#E1F1FB' }]}>
        <Ionicons name="water" size={64} color="#3B9AE1" />
      </View>
    );
  }
  return (
    <View style={[styles.art, styles.artTomato, { backgroundColor: '#FDEBD2' }]}>
      <Tomato size={44} />
      <Tomato size={56} />
      <Tomato size={44} />
    </View>
  );
}

export default function ShopScreen() {
  const colors = useColors();
  const pad = useLegacyPad();
  const { farm } = useStore();
  const [picked, setPicked] = useState<ShopProduct | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlowHeader title="상점" onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/farm'))} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: pad.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.balance, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Tomato size={32} />
          <Text style={[styles.balanceText, { color: colors.text }]}>보유 방울토마토 {farm.harvestCount}개</Text>
        </View>
        <Text style={[styles.guide, { color: colors.textSecondary }]}>모은 방울토마토로 실제 상품을 구입할 수 있어요.</Text>

        <View style={styles.grid}>
          {SHOP_PRODUCTS.map((p) => {
            const lack = p.price - farm.harvestCount;
            return (
              <View key={p.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ProductArt art={p.art} />
                <View style={styles.body}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {p.description}
                  </Text>
                  <View style={styles.price}>
                    <Tomato size={18} />
                    <Text style={[styles.priceText, { color: colors.primary }]}>방울토마토 {p.price}개</Text>
                  </View>
                  <Button
                    label={lack > 0 ? `${lack}개 부족해요` : '구매하기'}
                    variant="accent"
                    disabled={lack > 0}
                    onPress={() => setPicked(p)}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={picked !== null} transparent animationType="fade" onRequestClose={() => setPicked(null)}>
        <View style={styles.modalBack}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>구매 기능을 준비 중이에요</Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              지금은 샘플 화면이라 주문할 수 없고, 방울토마토도 줄어들지 않아요.
            </Text>
            <Button label="확인" onPress={() => setPicked(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 16 },
  balanceText: { fontSize: 17, fontWeight: '800' },
  guide: { fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' },
  card: { width: '48.5%', borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  art: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  artTomato: { flexDirection: 'row', gap: 2 },
  body: { flex: 1, padding: 12, gap: 6 },
  name: { fontSize: 15, fontWeight: '800' },
  desc: { fontSize: 12, lineHeight: 17, minHeight: 34 },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  priceText: { flexShrink: 1, fontSize: 13, fontWeight: '800' },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modal: { width: '100%', maxWidth: 400, alignSelf: 'center', borderRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
