import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;