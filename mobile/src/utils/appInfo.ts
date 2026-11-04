import * as Application from "expo-application";
import { Linking, Share } from "react-native";

export const PLAY_STORE_ID = "com.wecanserve.scanmycard";
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_ID}`;

/** "Version 1.0.0 (15)", read from the installed app so it's always right. */
export function appVersionLabel(): string {
  const version = Application.nativeApplicationVersion || "1.0.0";
  const build = Application.nativeBuildVersion;
  return build ? `Version ${version} (${build})` : `Version ${version}`;
}

/** Opens ScanMyCard in the Play Store app (or the website if that fails). */
export async function openPlayStoreRating() {
  try {
    await Linking.openURL(`market://details?id=${PLAY_STORE_ID}`);
  } catch {
    await Linking.openURL(PLAY_STORE_URL).catch(() => {});
  }
}

export async function shareApp() {
  try {
    await Share.share({
      message:
        "I use ScanMyCard to turn visiting cards into phone contacts and Excel sheets in seconds. " +
        `Get it here: ${PLAY_STORE_URL}`,
    });
  } catch {
    // The user closed the share sheet.
  }
}
