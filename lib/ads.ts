/**
 * 영상 사이 광고 계획.
 * 영상 gapMin~gapMax개를 볼 때마다 광고 하나를 무작위로 넣는다. 마지막 영상 뒤에는 넣지 않는다.
 * 반환값: { 슬롯 번호: 광고 id } — 그 슬롯 영상이 끝나고 다음 영상으로 넘어가기 전에 재생한다.
 */
export function planAds(
  videoCount: number,
  adIds: string[],
  gapMin: number,
  gapMax: number,
  rng: () => number = Math.random,
): Record<number, string> {
  const plan: Record<number, string> = {};
  if (adIds.length === 0) return plan;
  const gap = () => gapMin + Math.floor(rng() * (gapMax - gapMin + 1));
  let prev: string | undefined;
  for (let slot = gap() - 1; slot < videoCount - 1; slot += gap()) {
    // 광고가 2개 이상이면 같은 광고가 연달아 나오지 않게 한다
    const pool = adIds.length > 1 ? adIds.filter((id) => id !== prev) : adIds;
    const pick = pool[Math.floor(rng() * pool.length)];
    plan[slot] = pick;
    prev = pick;
  }
  return plan;
}
