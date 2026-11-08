import exercisesJson from './exercises.json';
import messagesJson from './messages.json';
import tipsJson from './tips.json';
import { appConfig } from '@/lib/config';
import type { Exercise } from '@/lib/types';
import type { WelcomeMessage } from '@/lib/messages';

/**
 * 운영자 관리 콘텐츠.
 * 로컬 단계: 이 폴더의 JSON 파일을 수정한다.
 * 베타 단계: 구글 스프레드시트 자동 반영으로 교체한다. (화면은 이 모듈만 읽는다)
 */
export const EXERCISES = exercisesJson as Exercise[];
export const WELCOME_MESSAGES = messagesJson.welcome as WelcomeMessage[];

export interface NotificationMessage {
  id: string;
  segment: 'not_moved' | 'moved';
  text: string;
}
export const NOTIFICATION_MESSAGES = messagesJson.notification as NotificationMessage[];

export interface DailyPhrase {
  id: string;
  band: 'morning' | 'afternoon' | 'evening';
  text: string;
}
export const DAILY_PHRASES = messagesJson.phrases as DailyPhrase[];

export interface TipCard {
  id: string;
  type: 'recipe' | 'health';
  title: string;
  body: string;
}
export const TIP_CARDS = tipsJson as TipCard[];

/** 기본 운동 목록 + 관리자가 올리거나 수정한 영상 (같은 id면 관리자 내용이 우선) */
export function mergeCatalog(custom: Exercise[]): Exercise[] {
  const byId = new Map(custom.map((e) => [e.id, e]));
  const builtIn = new Set(EXERCISES.map((e) => e.id));
  return [...EXERCISES.map((e) => byId.get(e.id) ?? e), ...custom.filter((e) => !builtIn.has(e.id))];
}

let catalog: Exercise[] = EXERCISES;

/** 앱 상태에서 관리자 영상이 바뀔 때마다 호출한다 */
export function setCustomExercises(custom: Exercise[]): Exercise[] {
  catalog = mergeCatalog(custom);
  return catalog;
}

export const allExercises = (): Exercise[] => catalog;

export const exerciseById = (id: string): Exercise | undefined => catalog.find((e) => e.id === id);

/** 영상 길이(초). 목록에 적힌 길이, 없으면 설정의 기본 길이(1분) */
export const videoSecOf = (ex: Exercise | undefined): number => ex?.durationSec ?? appConfig.videoSec;
