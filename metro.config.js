const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Debug ID 付き source map を生成し、Sentry 上のスタックトレースを復元できるようにする。
module.exports = getSentryExpoConfig(__dirname);
