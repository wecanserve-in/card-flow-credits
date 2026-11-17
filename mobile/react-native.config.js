// Meta (Facebook) SDK is Android-only for now: keep it out of the iPhone app.
module.exports = {
  dependencies: {
    "react-native-fbsdk-next": { platforms: { ios: null } },
  },
};
