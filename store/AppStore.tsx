import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  EXERCISES,
  TIP_CARDS,
  WELCOME_MESSAGES,
  allExercises,
  exerciseById,
  mergeCatalog,
  setCustomExercises,
  videoSecOf,
} from '@/data/content';
import { deleteMedia, putMedia } from '@/data/media';
import { localRepository, type Repository, type UserData } from '@/data/repository';
import { appConfig } from '@/lib/config';
import { dateKey, todayKey } from '@/lib/date';
import { addDrops, waterCrop as waterCropRule, type WaterResult } from '@/lib/farm';
import { pickMessage, relationOf, restBucketOf, welcomeRestDays, type WelcomeMessage } from '@/lib/messages';
import { isAdLive } from '@/lib/adReport';
import { isBannerAd, planAds } from '@/lib/ads';
import { continuePlaylist, playlistFrom, rankVideos } from '@/lib/recommend';
import { creditedMinutes, dropsToGrant, isItemCompleted, playsEarningDrop } from '@/lib/session';
import { dropsOnDate, movedDateKeys } from '@/lib/stats';
import { sessionPoints } from '@/lib/rewards';
import type {
  AdVideo,
  AppSettings,
  Exercise,
  InProgress,
  Posture,
  Perceived,
  Schedule,
  Session,
  SessionItem,
  VideoStat,
} from '@/lib/types';

interface StoreValue extends UserData {
  ready: boolean;
  /** 기본 운동 목록 + 관리자가 올린 영상 */
  catalog: Exercise[];
  /**
   * 고른 영상부터 재생을 시작한다. 뒤에는 같은 바둑판(posture)의 추천 영상이 이어진다 (최대 playlistMax개).
   * posture를 주지 않으면 고른 영상의 자세 (예약에서 시작할 때).
   */
  startSession(exerciseId: string, posture?: Posture | 'all'): InProgress | null;
  /** 체크박스로 고른 영상이나 지난 기록의 루틴을 그 순서대로 연결 재생한다 */
  startSelected(exerciseIds: string[], scope?: Posture | 'all'): InProgress | null;
  /** [계속 운동하기]: 방금 본 영상을 뺀 추천 영상으로 새 운동을 시작한다 */
  continueAfter(sessionId: string): InProgress | null;
  recordView(exerciseId: string): void;
  toggleLike(exerciseId: string): void;
  recordAdView(adId: string): void;
  recordAdClick(adId: string): void;
  /** 관리자: 운동 영상 저장 (파일이 있으면 교체) */
  saveVideo(video: Exercise, files: { video?: Blob; thumb?: Blob }): Promise<void>;
  /** 관리자: 올린 영상 삭제. 기본 영상을 수정한 것이면 기본값으로 되돌린다 */
  deleteVideo(id: string): Promise<void>;
  saveAd(ad: AdVideo, file?: Blob): Promise<void>;
  deleteAd(id: string): Promise<void>;
  /** 현재 재생 상태를 저장 (재생 초는 slotPlayedSec에 누적된 값) */
  saveProgress(next: InProgress): void;
  finishSession(current: InProgress): Session;
  /** 완료 화면의 체감 난이도 (같은 값을 다시 누르면 취소) */
  setPerceived(sessionId: string, perceived: Perceived | undefined): void;
  /** 마지막으로 고른 자세 (홈 자세 버튼·바둑판 자세 필터) */
  setLastPosture(posture: Posture | null): void;
  addSchedule(schedule: Omit<Schedule, 'id' | 'createdAt' | 'status'>): Schedule;
  updateSchedule(id: string, patch: Partial<Schedule>): void;
  waterCrop(): WaterResult;
  /** 오늘 보여 줄 환영 문구. 조건이 아니면 null */
  getWelcome(): WelcomeMessage | null;
  markWelcomeShown(messageId: string): void;
  markLoginPromptShown(): void;
  mockLogin(provider: 'kakao' | 'google' | 'guest'): void;
  setNotification(n: AppSettings['notification']): void;
  setReminder(patch: Partial<AppSettings['reminder']>): void;
  /** 알림 문구 기록 (최근 문구 중복 방지) */
  recordNotificationShown(messageId: string): void;
  resetAll(): Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const empty: UserData = {
  sessions: [],
  progress: {},
  farm: { drops: 0, cropProgress: 0, harvestCount: 0, unlockedTipIds: [] },
  settings: {
    firstUseDate: todayKey(),
    lastPosture: null,
    welcomeShownDate: null,
    loginPromptShown: false,
    notification: { ...appConfig.notificationDefault },
    reminder: { snoozeUntil: null, stopDate: null, lastFiredKey: null },
    account: { provider: 'guest' },
  },
  history: { welcome: [], notification: [] },
  inProgress: null,
  schedules: [],
  videoStats: {},
  customVideos: [],
  ads: [],
};

const emptyStat: VideoStat = { picks: 0, plays: 0, completes: 0, quits: 0 };

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function AppStoreProvider({
  children,
  repository = localRepository,
}: {
  children: React.ReactNode;
  repository?: Repository;
}) {
  const [data, setData] = useState<UserData>(empty);
  const [ready, setReady] = useState(false);
  const ref = useRef<UserData>(empty);

  const commit = useCallback((patch: Partial<UserData>) => {
    ref.current = { ...ref.current, ...patch };
    setData(ref.current);
  }, []);

  /** 중단된 세션을 기록으로 확정한다 (이어하지 않은 채 날이 바뀌었거나 새 운동을 시작할 때) */
  const finalize = useCallback(
    (cur: InProgress): Session => {
      const items: SessionItem[] = [
        ...cur.extraItems,
        ...cur.playlist.map((id, i) => ({
          exerciseId: id,
          playedSec: Math.round(cur.slotPlayedSec[i] ?? 0),
          skipped: false,
          videoSec: cur.slotVideoSec?.[i] ?? videoSecOf(exerciseById(id)),
        })),
      ].filter((it) => it.skipped || it.playedSec > 0);
      // 끝까지 봤는지: 영상마다 길이가 다르므로 그 영상 길이의 일정 비율 이상 재생
      const completed = (it: SessionItem) =>
        isItemCompleted(
          it.playedSec,
          it.skipped,
          it.videoSec ?? videoSecOf(exerciseById(it.exerciseId)),
          appConfig.completeRatio,
        );

      const actualSec = Math.round(items.reduce((s, it) => s + it.playedSec, 0));
      const credited = creditedMinutes(actualSec);
      const already = dropsOnDate(ref.current.sessions, cur.localDate);
      const drops = dropsToGrant(playsEarningDrop(cur.slotPlayedSec, cur.slotLaps), already, appConfig.dropDailyLimit);

      const session: Session = {
        id: cur.id,
        startedAt: cur.startedAt,
        localDate: cur.localDate,
        posture: cur.posture,
        scope: cur.scope,
        actualSec,
        creditedMin: credited,
        dropsEarned: drops,
        items,
        points: sessionPoints(
          items,
          credited,
          completed,
          exerciseById,
        ),
      };

      const sessions = [session, ...ref.current.sessions.filter((s) => s.id !== session.id)];
      commit({ sessions, inProgress: null });
      void repository.saveSessions(sessions);
      void repository.saveInProgress(null);

      // 영상별 시청 기록: 끝까지 봤는지, 중간에 넘겼는지
      const videoStats = { ...ref.current.videoStats };
      for (const it of items) {
        if (it.playedSec <= 0) continue;
        const prev = videoStats[it.exerciseId] ?? emptyStat;
        const done = completed(it);
        videoStats[it.exerciseId] = {
          ...prev,
          plays: prev.plays + 1,
          completes: prev.completes + (done ? 1 : 0),
          quits: prev.quits + (done ? 0 : 1),
          lastPlayedAt: session.startedAt,
        };
      }
      commit({ videoStats });
      void repository.saveVideoStats(videoStats);

      if (credited >= 1) {
        const progress = { ...ref.current.progress };
        for (const it of items) {
          if (completed(it)) {
            progress[it.exerciseId] = (progress[it.exerciseId] ?? 0) + 1;
          }
        }
        commit({ progress });
        void repository.saveProgress(progress);
      }
      if (drops > 0) {
        const farm = addDrops(ref.current.farm, drops);
        commit({ farm });
        void repository.saveFarm(farm);
      }
      return session;
    },
    [commit, repository],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const loaded = await repository.load();
      if (!alive) return;
      setCustomExercises(loaded.customVideos);
      ref.current = loaded;
      setData(loaded);
      // 어제 이전에 멈춘 세션은 이어하지 않은 것으로 보고 확정
      if (loaded.inProgress && loaded.inProgress.localDate !== todayKey()) {
        finalize(loaded.inProgress);
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [repository, finalize]);

  /** 재생 목록으로 새 운동을 시작한다. picked: 사용자가 직접 고른 영상 ('자주 찾은 영상') */
  const begin = useCallback(
    (playlist: string[], scope: Posture | 'all', picked: string[]): InProgress => {
      const now = Date.now();
      const posture = scope !== 'all' ? scope : (exerciseById(playlist[0])?.postures[0] ?? 'sitting');
      const activeAds = ref.current.ads.filter((a) => !isBannerAd(a) && isAdLive(a, dateKey(now))).map((a) => a.id);
      const cur: InProgress = {
        id: newId(),
        startedAt: new Date(now).toISOString(),
        localDate: dateKey(now),
        posture,
        scope,
        adPlan: planAds(playlist.length, activeAds, appConfig.adGapMin, appConfig.adGapMax),
        playlist,
        slotIndex: 0,
        slotPlayedSec: playlist.map(() => 0),
        extraItems: [],
        updatedAt: new Date(now).toISOString(),
      };
      const videoStats = { ...ref.current.videoStats };
      for (const id of picked) {
        const prev = videoStats[id] ?? emptyStat;
        videoStats[id] = { ...prev, picks: prev.picks + 1 };
      }
      commit({ inProgress: cur, videoStats });
      void repository.saveInProgress(cur);
      void repository.saveVideoStats(videoStats);
      return cur;
    },
    [commit, repository],
  );

  const startSession = useCallback(
    (exerciseId: string, posture?: Posture | 'all'): InProgress | null => {
      const first = exerciseById(exerciseId);
      if (!first) return null;
      if (ref.current.inProgress) finalize(ref.current.inProgress);
      const scope = posture ?? first.postures[0];
      const ranked = rankVideos(allExercises(), scope, ref.current.videoStats);
      return begin(playlistFrom(ranked, first.id, appConfig.playlistMax), scope, [first.id]);
    },
    [begin, finalize],
  );

  const startSelected = useCallback(
    (exerciseIds: string[], scope?: Posture | 'all'): InProgress | null => {
      const ids = exerciseIds.filter((id) => exerciseById(id)).slice(0, appConfig.playlistMax);
      if (ids.length === 0) return null;
      if (ref.current.inProgress) finalize(ref.current.inProgress);
      return begin(ids, scope ?? ref.current.settings.lastPosture ?? 'all', ids);
    },
    [begin, finalize],
  );

  const continueAfter = useCallback(
    (sessionId: string): InProgress | null => {
      const done = ref.current.sessions.find((s) => s.id === sessionId);
      if (!done) return null;
      if (ref.current.inProgress) finalize(ref.current.inProgress);
      const scope = done.scope ?? done.posture;
      const ranked = rankVideos(allExercises(), scope, ref.current.videoStats);
      const playlist = continuePlaylist(ranked, done.items.map((it) => it.exerciseId), appConfig.playlistMax);
      return playlist.length > 0 ? begin(playlist, scope, []) : null;
    },
    [begin, finalize],
  );

  const patchStat = useCallback(
    (id: string, change: (s: VideoStat) => VideoStat) => {
      const videoStats = { ...ref.current.videoStats, [id]: change(ref.current.videoStats[id] ?? emptyStat) };
      commit({ videoStats });
      void repository.saveVideoStats(videoStats);
    },
    [commit, repository],
  );

  const recordView = useCallback(
    (id: string) => patchStat(id, (s) => ({ ...s, views: (s.views ?? 0) + 1 })),
    [patchStat],
  );

  const toggleLike = useCallback(
    (id: string) => patchStat(id, (s) => ({ ...s, liked: !s.liked })),
    [patchStat],
  );

  const commitAds = useCallback(
    (ads: AdVideo[]) => {
      commit({ ads });
      void repository.saveAds(ads);
    },
    [commit, repository],
  );

  /** 광고 결과를 오늘 날짜에 더한다 */
  const bumpAd = useCallback(
    (adId: string, field: 'views' | 'clicks') => {
      const today = todayKey();
      commitAds(
        ref.current.ads.map((a) => {
          if (a.id !== adId) return a;
          const day = a.stats[today] ?? { views: 0, clicks: 0 };
          return { ...a, stats: { ...a.stats, [today]: { ...day, [field]: day[field] + 1 } } };
        }),
      );
    },
    [commitAds],
  );

  const recordAdView = useCallback((adId: string) => bumpAd(adId, 'views'), [bumpAd]);
  const recordAdClick = useCallback((adId: string) => bumpAd(adId, 'clicks'), [bumpAd]);

  const commitVideos = useCallback(
    (customVideos: Exercise[]) => {
      setCustomExercises(customVideos);
      commit({ customVideos });
      void repository.saveCustomVideos(customVideos);
    },
    [commit, repository],
  );

  const saveVideo = useCallback(
    async (video: Exercise, files: { video?: Blob; thumb?: Blob }) => {
      const before = ref.current.customVideos.find((v) => v.id === video.id);
      const next = { ...video };
      if (files.video) next.video = await putMedia('video', video.id, files.video);
      if (files.thumb) next.thumbnail = await putMedia('thumb', video.id, files.thumb);
      commitVideos([next, ...ref.current.customVideos.filter((v) => v.id !== video.id)]);
      if (before && before.video !== next.video) await deleteMedia(before.video);
      if (before && before.thumbnail !== next.thumbnail) await deleteMedia(before.thumbnail);
    },
    [commitVideos],
  );

  const deleteVideo = useCallback(
    async (id: string) => {
      const target = ref.current.customVideos.find((v) => v.id === id);
      const builtIn = EXERCISES.find((e) => e.id === id);
      if (!target && !builtIn) return;
      const rest = ref.current.customVideos.filter((v) => v.id !== id);
      commitVideos(builtIn ? [{ ...builtIn, deleted: true }, ...rest] : rest);
      await deleteMedia(target?.video);
      await deleteMedia(target?.thumbnail);
    },
    [commitVideos],
  );

  const saveAd = useCallback(
    async (ad: AdVideo, file?: Blob) => {
      const before = ref.current.ads.find((a) => a.id === ad.id);
      const next = file ? { ...ad, video: await putMedia('ad', ad.id, file) } : ad;
      commitAds([next, ...ref.current.ads.filter((a) => a.id !== ad.id)]);
      if (before && before.video !== next.video) await deleteMedia(before.video);
    },
    [commitAds],
  );

  const deleteAd = useCallback(
    async (id: string) => {
      const target = ref.current.ads.find((a) => a.id === id);
      if (!target) return;
      commitAds(ref.current.ads.filter((a) => a.id !== id));
      await deleteMedia(target.video);
    },
    [commitAds],
  );

  const saveProgress = useCallback(
    (next: InProgress) => {
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      commit({ inProgress: stamped });
      void repository.saveInProgress(stamped);
    },
    [commit, repository],
  );

  const finishSession = useCallback(
    (cur: InProgress): Session => finalize(cur),
    [finalize],
  );

  const setPerceived = useCallback(
    (sessionId: string, perceived: Perceived | undefined) => {
      const sessions = ref.current.sessions.map((s) =>
        s.id === sessionId ? { ...s, perceived } : s,
      );
      commit({ sessions });
      void repository.saveSessions(sessions);
    },
    [commit, repository],
  );

  const addSchedule = useCallback(
    (input: Omit<Schedule, 'id' | 'createdAt' | 'status'>): Schedule => {
      const schedule: Schedule = {
        ...input,
        id: newId(),
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      };
      const schedules = [schedule, ...ref.current.schedules];
      commit({ schedules });
      void repository.saveSchedules(schedules);
      return schedule;
    },
    [commit, repository],
  );

  const updateSchedule = useCallback(
    (id: string, patch: Partial<Schedule>) => {
      const schedules = ref.current.schedules.map((s) => (s.id === id ? { ...s, ...patch } : s));
      commit({ schedules });
      void repository.saveSchedules(schedules);
    },
    [commit, repository],
  );


  const waterCrop = useCallback((): WaterResult => {
    const result = waterCropRule(
      ref.current.farm,
      appConfig.dropsPerHarvest,
      TIP_CARDS.map((t) => t.id),
    );
    if (result.watered) {
      commit({ farm: result.farm });
      void repository.saveFarm(result.farm);
    }
    return result;
  }, [commit, repository]);

  const getWelcome = useCallback((): WelcomeMessage | null => {
    const { sessions, settings, history } = ref.current;
    const today = todayKey();
    const moved = movedDateKeys(sessions);
    const rest = welcomeRestDays(moved, today, settings.welcomeShownDate);
    if (rest === null) return null;
    const relation = relationOf(settings.firstUseDate, today, moved.length);
    const group = WELCOME_MESSAGES.filter(
      (m) => m.restBucket === restBucketOf(rest) && m.relation === relation,
    );
    return pickMessage(group, history.welcome);
  }, []);

  const markWelcomeShown = useCallback(
    (messageId: string) => {
      const settings = { ...ref.current.settings, welcomeShownDate: todayKey() };
      const history = {
        ...ref.current.history,
        welcome: [...ref.current.history.welcome, messageId].slice(-10),
      };
      commit({ settings, history });
      void repository.saveSettings(settings);
      void repository.saveHistory(history);
    },
    [commit, repository],
  );

  const patchSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      const settings = { ...ref.current.settings, ...patch };
      commit({ settings });
      void repository.saveSettings(settings);
    },
    [commit, repository],
  );

  const markLoginPromptShown = useCallback(
    () => patchSettings({ loginPromptShown: true }),
    [patchSettings],
  );
  const mockLogin = useCallback(
    (provider: 'kakao' | 'google' | 'guest') => patchSettings({ account: { provider } }),
    [patchSettings],
  );
  const setNotification = useCallback(
    (notification: AppSettings['notification']) => patchSettings({ notification }),
    [patchSettings],
  );
  const setLastPosture = useCallback(
    (lastPosture: Posture | null) => patchSettings({ lastPosture }),
    [patchSettings],
  );

  const setReminder = useCallback(
    (patch: Partial<AppSettings['reminder']>) =>
      patchSettings({ reminder: { ...ref.current.settings.reminder, ...patch } }),
    [patchSettings],
  );
  const recordNotificationShown = useCallback(
    (messageId: string) => {
      const history = {
        ...ref.current.history,
        notification: [...ref.current.history.notification, messageId].slice(-10),
      };
      commit({ history });
      void repository.saveHistory(history);
    },
    [commit, repository],
  );

  const resetAll = useCallback(async () => {
    await repository.clear();
    const fresh = await repository.load();
    setCustomExercises(fresh.customVideos);
    ref.current = fresh;
    setData(fresh);
  }, [repository]);

  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      catalog: mergeCatalog(data.customVideos),
      ready,
      startSession,
      startSelected,
      continueAfter,
      recordView,
      toggleLike,
      recordAdView,
      recordAdClick,
      saveVideo,
      deleteVideo,
      saveAd,
      deleteAd,
      saveProgress,
      finishSession,
      setPerceived,
      setLastPosture,
      addSchedule,
      updateSchedule,
      waterCrop,
      getWelcome,
      markWelcomeShown,
      markLoginPromptShown,
      mockLogin,
      setNotification,
      setReminder,
      recordNotificationShown,
      resetAll,
    }),
    [
      data, ready, startSession, startSelected, continueAfter, recordView, toggleLike, recordAdView, recordAdClick,
      saveVideo, deleteVideo, saveAd, deleteAd, saveProgress, finishSession, setPerceived,
      setLastPosture, addSchedule, updateSchedule,
      waterCrop, getWelcome, markWelcomeShown, markLoginPromptShown, mockLogin, setNotification,
      setReminder, recordNotificationShown, resetAll,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside AppStoreProvider');
  return ctx;
}

export type { Exercise };
