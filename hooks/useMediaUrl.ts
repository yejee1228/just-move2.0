import { useEffect, useState } from 'react';
import { isLocalMedia, mediaUrl } from '@/data/media';
import { publicPath } from '@/lib/assets';

export type MediaStatus = 'none' | 'loading' | 'ready' | 'missing';

/** 운동 목록의 video·thumbnail 값을 실제 주소로 바꾼다 (public 폴더 경로 또는 관리자가 올린 파일) */
export function useMediaUrl(ref: string | undefined): { src: string | null; status: MediaStatus } {
  const [loaded, setLoaded] = useState<{ ref: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!ref || !isLocalMedia(ref)) return;
    let alive = true;
    void mediaUrl(ref).then((url) => {
      if (alive) setLoaded({ ref, url });
    });
    return () => {
      alive = false;
    };
  }, [ref]);

  if (!ref) return { src: null, status: 'none' };
  if (!isLocalMedia(ref)) return { src: publicPath(ref), status: 'ready' };
  if (loaded?.ref !== ref) return { src: null, status: 'loading' };
  return loaded.url ? { src: loaded.url, status: 'ready' } : { src: null, status: 'missing' };
}
