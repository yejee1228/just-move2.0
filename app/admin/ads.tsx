import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import {
  AD_STATUS_TONE,
  AdminButton,
  AdminShell,
  AdminTable,
  Chips,
  DateInput,
  DoneNote,
  Drawer,
  Field,
  FieldRow,
  FilePick,
  FormError,
  Input,
  SectionCard,
  StatusPill,
  ToggleRow,
  saveErrorMessage,
  type Column,
} from '@/components/AdminUI';
import { probeVideo } from '@/data/media';
import { AD_STATUS_LABEL, adStatus, adTotals, ctrText, sortAdsForList } from '@/lib/adReport';
import { appConfig } from '@/lib/config';
import { addDays, todayKey } from '@/lib/date';
import { formatCount } from '@/lib/recommend';
import { isBannerAd } from '@/lib/ads';
import type { AdKind, AdVideo } from '@/lib/types';
import { useStore } from '@/store/AppStore';

/** A-03 관리자: 영상 광고(영상 사이)와 배너 광고(운동 영상 아래) 올리기·수정·삭제, 게시 기간 */

const DEFAULT_DAYS = 30;

const KINDS: { value: AdKind; label: string }[] = [
  { value: 'video', label: '영상 광고' },
  { value: 'banner', label: '배너 광고' },
];

const COLUMNS: Column[] = [
  { label: '광고', flex: 2 },
  { label: '종류', width: 60 },
  { label: '게시 기간', width: 170 },
  { label: '상태', width: 80 },
  { label: '길이', width: 52 },
  { label: '건너뛰기', width: 76 },
  { label: '노출', width: 52, align: 'right' },
  { label: '클릭', width: 52, align: 'right' },
  { label: '클릭률', width: 62, align: 'right' },
  { label: '관리', width: 140, align: 'right' },
];

interface Form {
  kind: AdKind;
  title: string;
  advertiser: string;
  linkUrl: string;
  startDate: string;
  endDate: string;
  skipAfter: string;
  active: boolean;
}

function blank(): Form {
  const today = todayKey();
  return {
    kind: 'video',
    title: '',
    advertiser: '',
    linkUrl: '',
    startDate: today,
    endDate: addDays(today, DEFAULT_DAYS),
    skipAfter: String(appConfig.adSkipSec),
    active: true,
  };
}

export default function AdminAdsScreen() {
  const colors = useColors();
  const { ads, saveAd, deleteAd } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(blank);
  const [editing, setEditing] = useState<AdVideo | null>(null);
  const [file, setFile] = useState<{ file: File; durationSec?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const today = todayKey();

  const patch = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));

  const close = () => {
    setOpen(false);
    setForm(blank());
    setEditing(null);
    setFile(null);
    setError(null);
  };

  const openNew = () => {
    close();
    setDone(null);
    setOpen(true);
  };

  const startEdit = (ad: AdVideo) => {
    close();
    setDone(null);
    setEditing(ad);
    setForm({
      kind: ad.kind ?? 'video',
      title: ad.title,
      advertiser: ad.advertiser,
      linkUrl: ad.linkUrl ?? '',
      startDate: ad.startDate,
      endDate: ad.endDate,
      skipAfter: ad.skipAfterSec === null ? '' : String(ad.skipAfterSec),
      active: ad.active,
    });
    setOpen(true);
  };

  const pick = async (f: File) => {
    setError(null);
    setBusy(true);
    try {
      const probe = await probeVideo(f);
      setFile({ file: f, durationSec: probe.durationSec });
    } catch {
      setFile(null);
      setError('이 브라우저에서 재생할 수 없는 영상이에요. MP4(H.264) 파일로 올려 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const pickBanner = (f: File) => {
    if (!f.type.startsWith('image/')) {
      setFile(null);
      setError('배너는 이미지 파일로 올려 주세요.');
      return;
    }
    setError(null);
    setFile({ file: f });
  };

  const submit = async () => {
    const banner = form.kind === 'banner';
    const linkUrl = form.linkUrl.trim();
    if (!form.title.trim()) return setError('광고 제목을 입력해 주세요.');
    if (!form.startDate || !form.endDate) return setError('게시 기간을 입력해 주세요.');
    if (form.startDate > form.endDate) return setError('게시 종료일은 시작일보다 빠를 수 없어요.');
    if (linkUrl && !/^https?:\/\//i.test(linkUrl)) return setError('링크는 http:// 또는 https:// 로 시작해야 해요.');
    if (!editing && !file) return setError(banner ? '배너 이미지를 골라 주세요.' : '광고 영상 파일을 골라 주세요.');

    setError(null);
    setBusy(true);
    try {
      await saveAd(
        {
          id: editing?.id ?? `ad-${Date.now().toString(36)}`,
          kind: form.kind,
          title: form.title.trim(),
          advertiser: form.advertiser.trim(),
          linkUrl: linkUrl || undefined,
          video: editing?.video ?? '',
          durationSec: banner ? undefined : (file?.durationSec ?? editing?.durationSec),
          startDate: form.startDate,
          endDate: form.endDate,
          skipAfterSec: banner || form.skipAfter === '' ? null : Number(form.skipAfter),
          active: form.active,
          stats: editing?.stats ?? {},
          createdAt: editing?.createdAt ?? new Date().toISOString(),
        },
        file?.file,
      );
      const title = form.title.trim();
      close();
      setDone(`'${title}' 광고를 저장했어요.`);
    } catch (e) {
      setError(saveErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const rows = sortAdsForList(ads, today).map((ad) => {
    const status = adStatus(ad, today);
    const t = adTotals(ad);
    return {
      key: ad.id,
      cells: [
        <View key="n">
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {ad.title}
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={1}>
            {ad.advertiser || '광고주 미입력'}
          </Text>
        </View>,
        isBannerAd(ad) ? '배너' : '영상',
        `${ad.startDate} ~ ${ad.endDate}`,
        <StatusPill key="s" label={AD_STATUS_LABEL[status]} tone={AD_STATUS_TONE[status]} />,
        ad.durationSec ? `${ad.durationSec}초` : '-',
        isBannerAd(ad) ? '-' : ad.skipAfterSec === null ? '없음' : `${ad.skipAfterSec}초 후`,
        formatCount(t.views),
        formatCount(t.clicks),
        ctrText(t.views, t.clicks),
        <View key="b" style={styles.btns}>
          <AdminButton small label="수정" variant="outline" onPress={() => startEdit(ad)} />
          <AdminButton
            small
            label={confirmId === ad.id ? '정말요?' : '삭제'}
            variant="danger"
            onPress={() => {
              if (confirmId !== ad.id) return setConfirmId(ad.id);
              setConfirmId(null);
              void deleteAd(ad.id);
            }}
          />
        </View>,
      ],
    };
  });

  return (
    <AdminShell
      active="ads"
      title="광고 관리"
      action={<AdminButton label="광고 올리기" icon="add" onPress={openNew} />}
      drawer={
        open ? (
          <Drawer title={editing ? `광고 수정: ${editing.title}` : '광고 올리기'} onClose={close}>
            {editing ? null : (
              <Field label="광고 종류 *" hint="영상 광고는 운동 영상 사이에, 배너 광고는 운동 영상 화면 아래에 나와요.">
                <Chips
                  options={KINDS}
                  isOn={(k) => form.kind === k}
                  onPress={(kind) => {
                    if (kind === form.kind) return;
                    setFile(null);
                    setError(null);
                    patch({ kind });
                  }}
                />
              </Field>
            )}
            {form.kind === 'banner' ? (
              <Field label={editing ? '배너 이미지 (바꿀 때만)' : '배너 이미지 *'} hint="가로:세로 6:1 이미지를 권장해요. (예: 1200×200) 비율이 다르면 위아래나 양옆이 잘려요.">
                <FilePick accept="image/*" label="이미지 고르기" fileName={file?.file.name} onPick={pickBanner} />
              </Field>
            ) : (
              <Field label={editing ? '광고 영상 파일 (바꿀 때만)' : '광고 영상 파일 *'}>
                <FilePick
                  accept="video/*"
                  label="영상 고르기"
                  fileName={file ? `${file.file.name} · ${file.durationSec}초` : undefined}
                  onPick={pick}
                />
              </Field>
            )}
            <Field label="광고 제목 *" hint={form.kind === 'banner' ? '관리 목록과 결과 리포트에서 구분하는 이름이에요.' : '광고가 나올 때 화면 위에 보여요.'}>
              <Input label="광고 제목" value={form.title} onChangeText={(title) => patch({ title })} />
            </Field>
            <Field label="광고주">
              <Input label="광고주" value={form.advertiser} onChangeText={(advertiser) => patch({ advertiser })} />
            </Field>
            <FieldRow>
              <Field label="게시 시작일 *">
                <DateInput label="게시 시작일" value={form.startDate} onChange={(startDate) => patch({ startDate })} />
              </Field>
              <Field label="게시 종료일 *">
                <DateInput label="게시 종료일" value={form.endDate} onChange={(endDate) => patch({ endDate })} />
              </Field>
            </FieldRow>
            <Field label="연결 링크" hint={form.kind === 'banner' ? '넣으면 배너를 눌렀을 때 이 주소가 열리고 클릭 수가 집계돼요.' : '넣으면 광고 화면에 [자세히 보기] 버튼이 나오고 클릭 수가 집계돼요.'}>
              <Input label="연결 링크" value={form.linkUrl} onChangeText={(linkUrl) => patch({ linkUrl })} placeholder="https://" />
            </Field>
            {form.kind === 'banner' ? null : (
              <Field label="건너뛰기 가능 시간(초)" hint="비워 두면 끝까지 봐야 해요.">
                <Input label="건너뛰기 가능 시간" numeric value={form.skipAfter} onChangeText={(skipAfter) => patch({ skipAfter })} />
              </Field>
            )}
            <ToggleRow label="앱에 공개" value={form.active} onChange={(active) => patch({ active })} />
            <FormError message={error} />
            <View style={styles.btns}>
              <AdminButton label={busy ? '처리 중…' : editing ? '수정 저장' : '저장'} icon="checkmark" disabled={busy} onPress={submit} />
              <AdminButton label="취소" variant="outline" disabled={busy} onPress={close} />
            </View>
          </Drawer>
        ) : null
      }
    >
      <DoneNote message={done} />
      <SectionCard title={`광고 목록 (${ads.length}개)`}>
        <Text style={[styles.guide, { color: colors.textSecondary }]}>
          영상 광고는 운동 영상 {appConfig.adGapMin}~{appConfig.adGapMax}개마다 무작위로 나오고, 배너 광고는 운동 영상 화면 아래에 영상마다 돌아가며 붙어요. 게시 기간 안의 공개 광고만 나오고, 시청 시간과 물방울에는 포함되지 않아요.
        </Text>
        <AdminTable columns={COLUMNS} rows={rows} empty="아직 올린 광고가 없어요. 광고가 없으면 영상만 이어서 재생돼요." minWidth={920} />
      </SectionCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  guide: { fontSize: 13, lineHeight: 19 },
  btns: { flexDirection: 'row', gap: 6 },
  name: { fontSize: 14, fontWeight: '700' },
  desc: { fontSize: 12, marginTop: 2 },
});
