import React, { createElement, useRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import type { AdStatus } from '@/lib/adReport';

/** 관리자 페이지 공통 부품 (/admin). PC 기준: 왼쪽 메뉴 + 넓은 표 + 오른쪽 입력 패널. 로그인은 아직 없다 */

const NAV = [
  { key: 'videos', label: '운동 영상', icon: 'videocam-outline', path: '/admin' },
  { key: 'ads', label: '광고 관리', icon: 'megaphone-outline', path: '/admin/ads' },
  { key: 'report', label: '광고 결과', icon: 'bar-chart-outline', path: '/admin/report' },
] as const;

type NavKey = (typeof NAV)[number]['key'];

const WIDE = 960;

export function AdminShell({
  active,
  title,
  action,
  drawer,
  children,
}: {
  active: NavKey;
  title: string;
  action?: React.ReactNode;
  /** 오른쪽 입력 패널 */
  drawer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  return (
    <View style={[styles.shell, wide && styles.shellWide, { backgroundColor: colors.background }]}>
      <View style={[styles.side, wide ? styles.sideWide : styles.sideNarrow, { backgroundColor: colors.primary }]}>
        <Text style={styles.brand}>JUST MOVE</Text>
        {wide ? <Text style={styles.brandSub}>관리자</Text> : null}
        <View style={[styles.nav, !wide && styles.navNarrow]}>
          {NAV.map((n) => {
            const on = n.key === active;
            return (
              <Pressable
                key={n.key}
                accessibilityRole="link"
                accessibilityState={{ selected: on }}
                onPress={() => router.replace(n.path)}
                style={({ hovered }: { hovered?: boolean }) => [
                  styles.navItem,
                  (on || hovered) && { backgroundColor: on ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)' },
                ]}
              >
                <Ionicons name={n.icon as never} size={18} color="#FFFFFF" />
                <Text style={styles.navText}>{n.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {wide ? (
          <Pressable accessibilityRole="link" onPress={() => router.replace('/(tabs)')} style={styles.backLink}>
            <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.75)" />
            <Text style={styles.backText}>앱으로 돌아가기</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView style={styles.main} contentContainerStyle={styles.mainInner} keyboardShouldPersistTaps="handled">
        <View style={styles.page}>
          <View style={styles.pageHead}>
            <Text style={[styles.pageTitle, { color: colors.primary }]}>{title}</Text>
            {action}
          </View>
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={16} color="#B45309" />
            <Text style={styles.noticeText}>
              아직 서버가 없어서 영상·광고·결과는 지금 이 브라우저에만 저장돼요. 앱 사용자에게 공개하려면 서버 연결이 필요해요.
            </Text>
          </View>
          {children}
        </View>
      </ScrollView>

      {drawer}
    </View>
  );
}

/** 오른쪽에서 열리는 입력 패널 */
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  return (
    <View style={styles.drawerRoot}>
      <Pressable accessibilityLabel="패널 닫기" onPress={onClose} style={styles.backdrop} />
      <View style={[styles.drawer, { width: Math.min(560, width), backgroundColor: colors.card }]}>
        <View style={[styles.drawerHead, { borderBottomColor: colors.border }]}>
          <Text style={[styles.drawerTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.drawerBody} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

export function SectionCard({ title, right, children }: { title?: string; right?: React.ReactNode; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {title || right ? (
        <View style={styles.cardHead}>
          {title ? <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text> : <View />}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export interface Column {
  label: string;
  /** 고정 너비. 없으면 남는 폭을 flex 비율로 나눈다 */
  width?: number;
  flex?: number;
  align?: 'left' | 'right' | 'center';
}

/** PC용 표. 좁은 창에서는 표만 옆으로 밀린다 */
export function AdminTable({
  columns,
  rows,
  empty,
  minWidth = 860,
}: {
  columns: Column[];
  rows: { key: string; cells: React.ReactNode[] }[];
  empty?: string;
  minWidth?: number;
}) {
  const colors = useColors();
  const cellStyle = (c: Column) => [
    styles.cell,
    c.width ? { width: c.width } : { flex: c.flex ?? 1 },
    c.align === 'right' && styles.cellRight,
    c.align === 'center' && styles.cellCenter,
  ];
  return (
    <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, minWidth }}>
        <View style={[styles.tr, { backgroundColor: colors.secondary, borderRadius: 8 }]}>
          {columns.map((c) => (
            <View key={c.label} style={cellStyle(c)}>
              <Text style={[styles.th, { color: colors.textSecondary }]}>{c.label}</Text>
            </View>
          ))}
        </View>
        {rows.length === 0 && empty ? <Text style={[styles.empty, { color: colors.textSecondary }]}>{empty}</Text> : null}
        {rows.map((r) => (
          <View key={r.key} style={[styles.tr, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            {r.cells.map((node, i) => (
              <View key={columns[i].label} style={cellStyle(columns[i])}>
                {typeof node === 'string' || typeof node === 'number' ? (
                  <Text style={[styles.td, { color: colors.text }]} numberOfLines={2}>
                    {node}
                  </Text>
                ) : (
                  node
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/** 광고 상태별 색 */
export const AD_STATUS_TONE: Record<AdStatus, 'green' | 'orange' | 'gray'> = {
  live: 'green',
  scheduled: 'orange',
  ended: 'gray',
  hidden: 'gray',
};

const TONES = {
  green: { bg: '#E6F4EF', fg: '#147A5A' },
  orange: { bg: '#FEF5E7', fg: '#B45309' },
  gray: { bg: '#EDF0F3', fg: '#52636F' },
};

export function StatusPill({ label, tone }: { label: string; tone: keyof typeof TONES }) {
  return (
    <View style={[styles.pill, { backgroundColor: TONES[tone].bg }]}>
      <Text style={[styles.pillText, { color: TONES[tone].fg }]}>{label}</Text>
    </View>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.primary }]}>{value}</Text>
    </View>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {children}
      {hint ? <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.fieldRow}>
      {React.Children.map(children, (c) => (
        <View style={{ flex: 1 }}>{c}</View>
      ))}
    </View>
  );
}

export function Input({
  value,
  onChangeText,
  placeholder,
  multiline,
  numeric,
  label,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  label: string;
}) {
  const colors = useColors();
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={(t) => onChangeText(numeric ? t.replace(/[^0-9]/g, '') : t)}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      keyboardType={numeric ? 'numeric' : 'default'}
      multiline={multiline}
      style={[
        styles.input,
        multiline && styles.inputMulti,
        { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
      ]}
    />
  );
}

/** 날짜 입력 (웹 달력). 값은 YYYY-MM-DD */
export function DateInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const colors = useColors();
  if (Platform.OS !== 'web') return <Input label={label} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" />;
  return createElement('input', {
    type: 'date',
    'aria-label': label,
    value,
    onChange: (e: { target: HTMLInputElement }) => onChange(e.target.value),
    style: {
      height: 44,
      boxSizing: 'border-box',
      width: '100%',
      padding: '0 12px',
      fontSize: 15,
      borderRadius: 10,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.background,
      color: colors.text,
      fontFamily: 'inherit',
    },
  });
}

export function Chips<T extends string>({
  options,
  isOn,
  onPress,
}: {
  options: { value: T; label: string }[];
  isOn: (v: T) => boolean;
  onPress: (v: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = isOn(o.value);
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onPress(o.value)}
            style={[
              styles.chip,
              { backgroundColor: on ? colors.primary : colors.card, borderColor: on ? colors.primary : colors.border },
            ]}
          >
            <Text style={[styles.chipText, { color: on ? '#FFFFFF' : colors.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const colors = useColors();
  return (
    <View style={styles.toggle}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.accent }} />
    </View>
  );
}

/** 파일 고르기 버튼 (웹 전용) */
export function FilePick({
  accept,
  label,
  fileName,
  onPick,
}: {
  accept: string;
  label: string;
  fileName?: string;
  onPick: (file: File) => void;
}) {
  const colors = useColors();
  const ref = useRef<HTMLInputElement | null>(null);
  if (Platform.OS !== 'web') {
    return <Text style={[styles.hint, { color: colors.textSecondary }]}>파일은 웹 관리자 페이지에서 올려 주세요.</Text>;
  }
  return (
    <View style={styles.pick}>
      {createElement('input', {
        ref,
        type: 'file',
        accept,
        'aria-label': label,
        style: { display: 'none' },
        onChange: (e: { target: HTMLInputElement }) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        },
      })}
      <AdminButton label={label} icon="cloud-upload-outline" variant="outline" onPress={() => ref.current?.click()} />
      {fileName ? (
        <Text style={[styles.fileName, { color: colors.textSecondary }]} numberOfLines={1}>
          {fileName}
        </Text>
      ) : null}
    </View>
  );
}

export function AdminButton({
  label,
  icon,
  variant = 'fill',
  small,
  disabled,
  onPress,
}: {
  label: string;
  icon?: string;
  variant?: 'fill' | 'outline' | 'danger';
  small?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const fg = variant === 'fill' ? '#FFFFFF' : variant === 'danger' ? colors.destructive : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        variant === 'fill'
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { borderColor: variant === 'danger' ? colors.destructive : colors.primary },
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon as never} size={16} color={fg} /> : null}
      <Text style={[styles.btnText, small && styles.btnTextSmall, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function FormError({ message }: { message: string | null }) {
  const colors = useColors();
  if (!message) return null;
  return <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>;
}

export function DoneNote({ message }: { message: string | null }) {
  const colors = useColors();
  if (!message) return null;
  return <Text style={[styles.done, { color: colors.success }]}>{message}</Text>;
}

/** 파일 저장 실패 안내 문구 */
export function saveErrorMessage(e: unknown): string {
  return (e as { name?: string })?.name === 'QuotaExceededError'
    ? '브라우저 저장 공간이 부족해요. 필요 없는 영상을 지우고 다시 올려 주세요.'
    : '저장하지 못했어요. 다시 시도해 주세요.';
}

/** CSV 파일 내려받기. 엑셀에서 한글이 깨지지 않도록 BOM을 붙인다 */
export function downloadCsv(fileName: string, csv: string): void {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  shellWide: { flexDirection: 'row' },
  side: { paddingHorizontal: 14 },
  sideWide: { width: 232, paddingTop: 24, paddingBottom: 20 },
  sideNarrow: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  brand: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 1.5, paddingHorizontal: 10 },
  brandSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', paddingHorizontal: 10, marginTop: 2, marginBottom: 20 },
  nav: { gap: 4, flex: 1 },
  navNarrow: { flexDirection: 'row' },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderRadius: 10, paddingHorizontal: 10 },
  navText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 10 },
  backText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  main: { flex: 1 },
  mainInner: { padding: 28, alignItems: 'center' },
  page: { width: '100%', maxWidth: 1240, gap: 16 },
  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 },
  pageTitle: { fontSize: 24, fontWeight: '800' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 10, backgroundColor: '#FEF5E7' },
  noticeText: { flex: 1, color: '#B45309', fontSize: 13, fontWeight: '600' },
  drawerRoot: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,30,45,0.4)' },
  drawer: { height: '100%' },
  drawerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 20, borderBottomWidth: 1 },
  drawerTitle: { flex: 1, fontSize: 18, fontWeight: '800' },
  drawerBody: { padding: 20, gap: 16 },
  card: { borderRadius: 12, borderWidth: 1, padding: 18, gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 6 },
  cell: { paddingHorizontal: 6, paddingVertical: 8, justifyContent: 'center', alignItems: 'flex-start' },
  cellRight: { alignItems: 'flex-end' },
  cellCenter: { alignItems: 'center' },
  th: { fontSize: 12, fontWeight: '800' },
  td: { fontSize: 13, fontWeight: '500' },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 28 },
  pill: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '800' },
  stat: { flex: 1, minWidth: 160, borderRadius: 12, borderWidth: 1, padding: 18, gap: 4 },
  statLabel: { fontSize: 13, fontWeight: '700' },
  statValue: { fontSize: 28, fontWeight: '800' },
  field: { gap: 6 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, fontSize: 15 },
  inputMulti: { minHeight: 76, paddingVertical: 10, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 38, borderRadius: 19, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '700' },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  fileName: { fontSize: 13, flexShrink: 1 },
  btn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  btnSmall: { minHeight: 34, paddingHorizontal: 10, borderRadius: 8 },
  btnText: { fontSize: 14, fontWeight: '800' },
  btnTextSmall: { fontSize: 13 },
  error: { fontSize: 13, fontWeight: '700' },
  done: { fontSize: 13, fontWeight: '700' },
});
