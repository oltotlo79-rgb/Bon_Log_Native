const { withAndroidManifest } = require('@expo/config-plugins');

const MAIN_ACTIVITY_NAME = '.MainActivity';
const REVENUECAT_SAFE_LAUNCH_MODE = 'singleTop';

/**
 * RevenueCat の外部決済認証からアプリへ戻った際に購入がキャンセルされないよう、
 * MainActivity の launchMode を singleTop に固定する。
 */
module.exports = function withMainActivityLaunchMode(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const application = androidConfig.modResults.manifest.application?.[0];
    const mainActivity = application?.activity?.find(
      (activity) => activity.$['android:name'] === MAIN_ACTIVITY_NAME
    );

    if (mainActivity === undefined) {
      throw new Error(`AndroidManifest.xml に ${MAIN_ACTIVITY_NAME} が見つかりません。`);
    }

    mainActivity.$['android:launchMode'] = REVENUECAT_SAFE_LAUNCH_MODE;
    return androidConfig;
  });
};
