import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { MediaThumb } from '@/components/MediaThumb';
import {
  AdminButton,
  AdminShell,
  AdminTable,
  Chips,
  DoneNote,
  Drawer,
  Field,
  FilePick,
  FormError,
  Input,
  SectionCard,
  StatusPill,
  ToggleRow,
  saveErrorMessage,
  type Column,
} from '@/components/AdminUI';
import { POSTURE_ORDER } from '@/components/Legacy';
import { EXERCISES } from '@/data/content';
import { probeVideo, type VideoProbe } from '@/data/media';
import { formatCount, likeCountOf } from '@/lib/recommend';
import { POSTURE_LABEL, type Difficulty, type Exercise, type Posture } from '@/lib/types';
import { useStore } from '@/store/AppStore';

/** A-02 관리자: 운동 영상 올리기·수정·삭제. 앱의 운동 목록(exercises.json)과 같은 항목을 입력한다 */

const POSTURES = POSTURE_ORDER.map((p) => ({ value: p, label: POSTURE_LABEL[p] }));
const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: '쉬움', label: '쉬움' },
  { value: '보통', label: '보통' },
  { value: '어려움', label: '어려움' },
];
const ORIENTATIONS = [
  { value: 'portrait' as const, label: '세로' },
  { value: 'landscape' as const, label: '가로' },
];

const COLUMNS: Column[] = [
  { label: '썸네일', width: 64 },
  { label: '동작 이름', flex: 2.4 },
  { label: '자세', flex: 1 },
  { label: '길이', width: 56 },
  { label: '구분', width: 90 },
  { label: '상태', width: 68 },
  { label: '조회', width: 52, align: 'right' },
  { label: '좋아요', width: 56, align: 'right' },
  { label: '관리', width: 150, align: 'right' },
];

interface Form {
  name: string;
  description: string;
  postures: Posture[];
  carOk: boolean;
  orientation: Exercise['orientation'];
  isFirst: boolean;
  active: boolean;
  difficulty: Difficulty;
  caution: string;
}

const BLANK: Form = {
  name: '',
  description: '',
  postures: [],
  carOk: false,
  orientation: 'portrait',
  isFirst: false,
  active: true,
  difficulty: '쉬움',
  caution: '',
};

function formOf(e: Exercise): Form {
  return {
    name: e.name,
    description: e.description,
    postures: e.postures,
    carOk: e.carOk,
    orientation: e.orientation,
    isFirst: e.isFirst,
    active: e.active,
    difficulty: e.difficulty,
    caution: e.caution,
  };
}

function lengthText(sec: number | undefined): string {
  if (!sec) return '-';
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
}

export default function AdminVideosScreen() {
  const colors = useColors();
  const { catalog, customVideos, videoStats, saveVideo, deleteVideo } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(BLANK);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [videoFile, setVideoFile] = useState<{ file: File; probe: VideoProbe } | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const builtIn = useMemo(() => new Set(EXERCISES.map((e) => e.id)), []);
  const customIds = useMemo(() => new Set(customVideos.map((e) => e.id)), [customVideos]);

  const patch = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));

  const close = () => {
    setOpen(false);
    setForm(BLANK);
    setEditing(null);
    setVideoFile(null);
    setThumbFile(null);
    setError(null);
  };

  const openNew = () => {
    close();
    setDone(null);
    setOpen(true);
  };

  const startEdit = (e: Exercise) => {
    close();
    setDone(null);
    setEditing(e);
    setForm(formOf(e));
    setOpen(true);
  };

  const pickVideo = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const probe = await probeVideo(file);
      setVideoFile({ file, probe });
      patch({ orientation: probe.orientation });
    } catch {
      setVideoFile(null);
      setError('이 브라우저에서 재생할 수 없는 영상이에요. MP4(H.264) 파일로 올려 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!form.name.trim()) return setError('동작 이름을 입력해 주세요.');
    if (form.postures.length === 0) return setError('자세를 하나 이상 골라 주세요.');
    if (!editing && !videoFile) return setError('영상 파일을 골라 주세요.');

    setError(null);
    setBusy(true);
    try {
      const id = editing?.id ?? `v-${Date.now().toString(36)}`;
      await saveVideo(
        {
          id,
          name: form.name.trim(),
          description: form.description.trim(),
          postures: form.postures,
          carOk: form.carOk,
          video: editing?.video ?? '',
          orientation: form.orientation,
          durationSec: videoFile?.probe.durationSec ?? editing?.durationSec,
          thumbnail: editing?.thumbnail,
          isFirst: form.isFirst,
          active: form.active,
          difficulty: form.difficulty,
          caution: form.caution.trim(),
        },
        { video: videoFile?.file, thumb: thumbFile ?? videoFile?.probe.thumb ?? undefined },
      );
      const name = form.name.trim();
      close();
      setDone(`'${name}' 영상을 저장했어요.`);
    } catch (e) {
      setError(saveErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const rows = catalog.map((e) => {
    const isBuiltIn = builtIn.has(e.id);
    const changed = customIds.has(e.id);
    const stat = videoStats[e.id];
    return {
      key: e.id,
      cells: [
        <View key="t" style={styles.thumb}>
          <MediaThumb thumbnail={e.thumbnail} posture={e.postures[0]} iconSize={24} />
        </View>,
        <View key="n">
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {e.name}
          </Text>
          {e.description ? (
            <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
              {e.description}
            </Text>
          ) : null}
        </View>,
        e.postures.map((p) => POSTURE_LABEL[p]).join('·'),
        lengthText(e.durationSec),
        isBuiltIn ? (changed ? '기본(수정됨)' : '기본') : '직접 올림',
        <StatusPill key="s" label={e.active ? '공개' : '비공개'} tone={e.active ? 'green' : 'gray'} />,
        formatCount(stat?.views ?? 0),
        formatCount(likeCountOf(stat)),
        <View key="b" style={styles.btns}>
          <AdminButton small label="수정" variant="outline" onPress={() => startEdit(e)} />
          <AdminButton
            small
            label={confirmId === e.id ? '정말요?' : '삭제'}
            variant="danger"
            onPress={() => {
              if (confirmId !== e.id) return setConfirmId(e.id);
              setConfirmId(null);
              void deleteVideo(e.id);
            }}
          />
        </View>,
      ],
    };
  });

  return (
    <AdminShell
      active="videos"
      title="운동 영상"
      action={<AdminButton label="영상 올리기" icon="add" onPress={openNew} />}
      drawer={
        open ? (
          <Drawer title={editing ? `영상 수정: ${editing.name}` : '운동 영상 올리기'} onClose={close}>
            <Field
              label={editing ? '영상 파일 (바꿀 때만)' : '영상 파일 *'}
              hint="길이와 방향은 파일에서 자동으로 읽고, 썸네일도 자동으로 만들어요."
            >
              <FilePick
                accept="video/*"
                label="영상 고르기"
                fileName={videoFile ? `${videoFile.file.name} · ${lengthText(videoFile.probe.durationSec)}` : undefined}
                onPick={pickVideo}
              />
            </Field>
            <Field label="썸네일 이미지 (선택)" hint="고르지 않으면 영상 앞부분 화면을 써요.">
              <FilePick accept="image/*" label="이미지 고르기" fileName={thumbFile?.name} onPick={setThumbFile} />
            </Field>
            <Field label="동작 이름 *">
              <Input label="동작 이름" value={form.name} onChangeText={(name) => patch({ name })} placeholder="예: 앉아서 목 스트레칭" />
            </Field>
            <Field label="한 줄 설명">
              <Input label="한 줄 설명" value={form.description} onChangeText={(description) => patch({ description })} />
            </Field>
            <Field label="자세 * (여러 개 가능)">
              <Chips
                options={POSTURES}
                isOn={(p) => form.postures.includes(p)}
                onPress={(p) =>
                  patch({ postures: form.postures.includes(p) ? form.postures.filter((x) => x !== p) : [...form.postures, p] })
                }
              />
            </Field>
            <Field label="난이도 (MOVE 포인트)">
              <Chips options={DIFFICULTIES} isOn={(d) => form.difficulty === d} onPress={(difficulty) => patch({ difficulty })} />
            </Field>
            <Field label="주의사항">
              <Input label="주의사항" multiline value={form.caution} onChangeText={(caution) => patch({ caution })} />
            </Field>
            <Field label="영상 방향">
              <Chips options={ORIENTATIONS} isOn={(o) => form.orientation === o} onPress={(orientation) => patch({ orientation })} />
            </Field>
            <ToggleRow label="차 안(주차 중)에서 가능" value={form.carOk} onChange={(carOk) => patch({ carOk })} />
            <ToggleRow label="첫 동작으로 지정 (기록이 없을 때 맨 앞)" value={form.isFirst} onChange={(isFirst) => patch({ isFirst })} />
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
      <SectionCard title={`영상 목록 (${catalog.length}개)`}>
        <AdminTable columns={COLUMNS} rows={rows} minWidth={850} />
      </SectionCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  btns: { flexDirection: 'row', gap: 6 },
  thumb: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden' },
  name: { fontSize: 14, fontWeight: '700' },
  desc: { fontSize: 12, marginTop: 2 },
});
