export type Posture = 'lying' | 'sitting' | 'standing' | 'walking';
export type Perceived = 'light' | 'fit' | 'hard';
export type Difficulty = '쉬움' | '보통' | '어려움';

export const POSTURE_LABEL: Record<Posture, string> = {
  lying: '누워서',
  sitting: '앉아서',
  standing: '서서',
  walking: '걸으며',
};

export const PERCEIVED_LABEL: Record<Perceived, string> = {
  light: '가벼웠어요',
  fit: '적당했어요',
  hard: '힘들었어요',
};

/** 운동 목록 (운영자 관리 데이터) */
export interface Exercise {
  id: string;
  name: string;
  description: string;
  postures: Posture[];
  carOk: boolean;
  /** public/videos 아래 파일 경로 (예: /videos/lying-01.mp4). 파일이 없으면 임시 재생 모드 */
  video: string;
  orientation: 'portrait' | 'landscape';
  /** 썸네일 ('idb:키' = 관리자가 올린 이미지). 없으면 자세 아이콘 */
  thumbnail?: string;
  /** 영상 길이(초). 비워 두면 기본 1분으로 보고, 재생할 때 파일의 실제 길이를 쓴다 */
  durationSec?: number;
  isFirst: boolean;
  active: boolean;
  /** 관리자가 삭제한 기본 영상 표시. 기본 영상 데이터는 앱에 들어 있어서 이 표시로 목록에서 뺀다 */
  deleted?: boolean;
  /** 수정 전 운동 데이터에서 이어받은 필드 */
  difficulty: Difficulty;
  caution: string;
}

/**
 * 영상별 시청 기록 — 맞춤 추천(바둑판 순서)의 재료.
 * picks: 바둑판에서 직접 고른 횟수, completes: 끝까지 본 횟수, quits: 중간에 넘기거나 멈춘 횟수
 */
export interface VideoStat {
  picks: number;
  plays: number;
  completes: number;
  quits: number;
  /** 조회수: 영상이 재생을 시작한 횟수 */
  views?: number;
  /** 하트(좋아요)를 눌렀는지 */
  liked?: boolean;
  lastPlayedAt?: string;
}

/** 광고 종류. 영상 = 영상 사이 전체 화면, 배너 = 운동 영상 화면 아래 이미지 */
export type AdKind = 'video' | 'banner';

/** 광고 (관리자 등록) */
export interface AdVideo {
  id: string;
  /** 없으면 영상 광고 (배너가 생기기 전에 저장된 광고) */
  kind?: AdKind;
  title: string;
  advertiser: string;
  linkUrl?: string;
  /** 영상 또는 배너 이미지. 'idb:키' = 관리자가 올린 파일, /... = 앱에 포함된 샘플 */
  video: string;
  durationSec?: number;
  /** 게시 기간 (한국시간 YYYY-MM-DD, 양 끝 날짜 포함) */
  startDate: string;
  endDate: string;
  /** 몇 초 뒤 건너뛸 수 있는지. null이면 끝까지 봐야 한다 */
  skipAfterSec: number | null;
  active: boolean;
  /** 날짜별 결과: 노출·[자세히 보기] 클릭 횟수 */
  stats: Record<string, { views: number; clicks: number }>;
  createdAt: string;
}

export interface SessionItem {
  exerciseId: string;
  playedSec: number;
  skipped: boolean;
  /** 재생할 때 확인한 영상 길이(초). 끝까지 봤는지 판정에 쓴다 */
  videoSec?: number;
}

/** 저장된 운동 1회 */
export interface Session {
  id: string;
  startedAt: string; // ISO
  localDate: string; // KST YYYY-MM-DD
  posture: Posture;
  /** 바둑판에서 보던 자세 범위 ([계속 운동하기]의 추천 범위) */
  scope?: Posture | 'all';
  /** 예전 1·3·5분 선택 방식의 기록에만 있다 */
  plannedMin?: 1 | 3 | 5;
  actualSec: number;
  /** 인정 시간(분) = 실제 시청 시간을 1분 단위로 내린 값 */
  creditedMin: number;
  dropsEarned: number;
  /** 체감 난이도 (완료 화면 선택 입력) */
  perceived?: Perceived;
  items: SessionItem[];
  /** MOVE 포인트 (기록 시점에 계산) */
  points?: number;
  /** 동작별 실제 횟수 (완료 화면 선택 입력) */
  counts?: Record<string, number>;
  memo?: string;
}

/** 운동 예약 (수정 전 기능) */
export interface Schedule {
  id: string;
  exerciseId: string;
  plannedMin: 1 | 3 | 5;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM
  repeatType: 'once' | 'daily';
  status: 'scheduled' | 'completed' | 'cancelled';
  /** 마지막으로 알림을 띄운 날짜 (매일 반복용) */
  lastNotifiedDate?: string;
  createdAt: string;
}


/** 영상 재생 중인 세션 (중간 저장용) */
export interface InProgress {
  id: string;
  startedAt: string;
  localDate: string;
  posture: Posture;
  scope?: Posture | 'all';
  /** 슬롯 번호별로 그 영상 뒤에 나올 광고 id */
  adPlan?: Record<number, string>;
  /** 이미 광고를 보여 준 슬롯 번호 */
  adsShown?: number[];
  /** 차례로 이어서 볼 영상 id (최대 playlistMax개) */
  playlist: string[];
  slotIndex: number;
  /** 슬롯별 재생 초 / 건너뜀 */
  slotPlayedSec: number[];
  /** 슬롯별 반복 재생 횟수 (없으면 1) */
  slotRepeats?: number[];
  /** 슬롯별로 반복 재생을 마친 회차의 재생 초 (물방울을 회차마다 세는 데 쓴다) */
  slotLaps?: number[][];
  /** 슬롯별 영상의 실제 길이(초). 파일을 불러와 알게 된 것만 */
  slotVideoSec?: (number | null)[];
  /** 건너뛰기로 교체되어 밀려난 동작의 재생 기록 */
  extraItems: SessionItem[];
  updatedAt: string;
}

export interface AppSettings {
  firstUseDate: string;
  lastPosture: Posture | null;
  welcomeShownDate: string | null;
  loginPromptShown: boolean;
  notification: { enabled: boolean; startHour: number; endHour: number };
  /** 알림 미루기 상태 (앱이 열려 있을 때의 알림용) */
  reminder: { snoozeUntil: number | null; stopDate: string | null; lastFiredKey: string | null };
  /** 모의 로그인 상태 (베타에서 실제 로그인으로 교체) */
  account: { provider: 'guest' | 'kakao' | 'google' };
}

export interface MessageHistory {
  welcome: string[];
  notification: string[];
}
