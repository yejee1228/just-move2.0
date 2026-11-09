import React, { createElement, useEffect, useRef } from 'react';
import type { VideoSurfaceProps } from './VideoSurface.types';

/** 웹: HTML5 video. 파일을 읽지 못하면 onFail로 임시 재생 모드로 넘어간다. */
export default function VideoSurface({
  src,
  playing,
  onActiveChange,
  onEnded,
  onFail,
  onBlocked,
  onDuration,
  forceAutoplay,
}: VideoSurfaceProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) {
      const start = () => {
        const p = v.play();
        if (!p || typeof p.catch !== 'function') return;
        // 브라우저가 자동 재생을 막은 경우에만 처리한다 (파일 오류는 onError가 처리)
        p.catch((e: { name?: string }) => {
          if (e?.name !== 'NotAllowedError') return;
          if (forceAutoplay && !v.muted) {
            v.muted = true;
            start();
            return;
          }
          onBlocked();
        });
      };
      start();
    } else {
      v.pause();
    }
  }, [playing, src, onBlocked, forceAutoplay]);

  return createElement('video', {
    key: src,
    ref,
    src,
    playsInline: true,
    autoPlay: false,
    preload: 'auto',
    onPlaying: () => onActiveChange(true),
    onPause: () => onActiveChange(false),
    onWaiting: () => onActiveChange(false),
    onLoadedMetadata: (e: { currentTarget: HTMLVideoElement }) => {
      const d = e.currentTarget.duration;
      if (onDuration && Number.isFinite(d) && d > 0) onDuration(d);
    },
    onEnded,
    onError: onFail,
    style: { width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' },
  });
}
