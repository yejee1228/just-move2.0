/**
 * 관리자가 올린 영상·썸네일 파일 저장소.
 * 로컬 단계: 브라우저 IndexedDB (그 브라우저에서만 보인다)
 * 베타 단계: 같은 함수를 서버 저장소/CDN으로 교체한다. (화면은 이 모듈과 hooks/useMediaUrl만 쓴다)
 * 운동 목록의 video·thumbnail 값이 'idb:키' 모양이면 여기에 저장된 파일이다.
 */
const DB_NAME = 'jm2-media';
const STORE = 'files';
const PREFIX = 'idb:';

const urls = new Map<string, string>();

export const isLocalMedia = (ref: string): boolean => ref.startsWith(PREFIX);

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** 파일을 저장하고 운동 목록에 적을 참조값을 돌려준다. 파일을 바꿀 때마다 참조값도 달라진다 */
export async function putMedia(kind: string, id: string, file: Blob): Promise<string> {
  const key = `${kind}-${id}-${Date.now().toString(36)}`;
  // 브라우저가 공간이 부족할 때 임의로 지우지 않도록 요청 (거절돼도 저장은 된다)
  void navigator.storage?.persist?.().catch(() => undefined);
  await run('readwrite', (s) => s.put(file, key));
  return PREFIX + key;
}

export async function deleteMedia(ref: string | undefined): Promise<void> {
  if (!ref || !isLocalMedia(ref)) return;
  const url = urls.get(ref);
  if (url) URL.revokeObjectURL(url);
  urls.delete(ref);
  try {
    await run('readwrite', (s) => s.delete(ref.slice(PREFIX.length)));
  } catch {
    // 이미 없는 파일: 무시
  }
}

/** 재생·표시용 주소. 이 브라우저에 파일이 없으면 null */
export async function mediaUrl(ref: string): Promise<string | null> {
  const cached = urls.get(ref);
  if (cached) return cached;
  try {
    const blob = await run<Blob | undefined>('readonly', (s) => s.get(ref.slice(PREFIX.length)));
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urls.set(ref, url);
    return url;
  } catch {
    return null;
  }
}

export async function clearMedia(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  urls.forEach((url) => URL.revokeObjectURL(url));
  urls.clear();
  try {
    await run('readwrite', (s) => s.clear());
  } catch {
    // 무시
  }
}

export interface VideoProbe {
  durationSec: number;
  orientation: 'portrait' | 'landscape';
  /** 영상 앞부분에서 뽑은 썸네일 (뽑지 못하면 null) */
  thumb: Blob | null;
}

const THUMB_MAX = 480;

/** 올릴 영상 파일의 길이·방향을 읽고 썸네일을 뽑는다. 재생할 수 없는 파일이면 실패 */
export function probeVideo(file: Blob): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = url;

    let duration = 0;
    const timer = setTimeout(() => done(new Error('timeout')), 30000);
    function done(result: VideoProbe | Error) {
      clearTimeout(timer);
      v.onloadedmetadata = v.onseeked = v.onerror = null;
      v.removeAttribute('src');
      v.load();
      URL.revokeObjectURL(url);
      if (result instanceof Error) reject(result);
      else resolve(result);
    }

    function capture() {
      const orientation = v.videoHeight > v.videoWidth ? 'portrait' : 'landscape';
      const scale = Math.min(1, THUMB_MAX / Math.max(v.videoWidth, v.videoHeight, 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(v.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(v.videoHeight * scale));
      try {
        canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((thumb) => done({ durationSec: Math.round(duration), orientation, thumb }), 'image/jpeg', 0.8);
      } catch {
        done({ durationSec: Math.round(duration), orientation, thumb: null });
      }
    }

    v.onerror = () => done(new Error('unplayable'));
    v.onloadedmetadata = () => {
      if (Number.isFinite(v.duration)) {
        duration = v.duration;
        v.onseeked = capture;
        v.currentTime = Math.min(1, duration / 2);
        return;
      }
      // 휴대폰 녹화본 등 길이 정보가 없는 파일: 끝으로 이동시키면 길이를 알 수 있다
      v.onseeked = () => {
        duration = v.duration;
        if (!Number.isFinite(duration)) {
          done(new Error('no-duration'));
          return;
        }
        v.onseeked = capture;
        v.currentTime = Math.min(1, duration / 2);
      };
      v.currentTime = 1e7;
    };
  });
}
