export interface VideoSurfaceProps {
  src: string;
  playing: boolean;
  /** 영상이 실제로 재생되고 있는지(버퍼링 중이면 false) */
  onActiveChange: (active: boolean) => void;
  onEnded: () => void;
  /** 파일이 없거나 재생할 수 없을 때 → 임시 재생 모드로 전환 */
  onFail: () => void;
  /** 자동 재생이 브라우저에서 막혔을 때 */
  onBlocked: () => void;
  /** 소리 때문에 자동 재생이 막히면 음소거로 바꿔서라도 재생한다 (영상 광고) */
  forceAutoplay?: boolean;
  /** 파일을 불러와 영상 길이(초)를 알았을 때 */
  onDuration?: (sec: number) => void;
}
