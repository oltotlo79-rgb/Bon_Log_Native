// app.json は静的 JSON のため process.env を参照できない。環境変数由来の設定はこちらで解決する。
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    // public リポジトリのため google-services.json をコミットせず、EAS の file 型環境変数が
    // 展開する絶対パスを受け取る。ローカル開発ではリポジトリ直下の実ファイルへフォールバックする。
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
