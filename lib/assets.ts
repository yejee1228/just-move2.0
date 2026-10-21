/**
 * public 폴더 파일 경로에 배포 기준 경로를 붙인다.
 * 예: GitHub Pages(https://아이디.github.io/just-move2.0/)에서는 '/videos/a.mp4' → '/just-move2.0/videos/a.mp4'
 * 로컬 개발에서는 기준 경로가 없으므로 그대로 쓴다.
 */
export function publicPath(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
