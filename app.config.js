/**
 * app.json 설정에 배포용 기준 경로만 덧붙인다.
 * WEB_BASE_PATH가 있을 때(예: GitHub Pages 배포 '/just-move2.0')만 적용되고,
 * 로컬 개발(npm run web)에는 영향이 없다.
 */
module.exports = ({ config }) => {
  const base = process.env.WEB_BASE_PATH;
  if (!base) return config;
  return {
    ...config,
    experiments: { ...config.experiments, baseUrl: base },
  };
};
