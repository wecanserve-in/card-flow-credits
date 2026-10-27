import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../services/firebase";
import { initializePushNotifications } from "../services/notifications";
import {
  hasSignedInOnThisPhone,
  markSignedInOnThisPhone,
} from "../services/userService";

export default function RootLayout() {
  useEffect(() => {
    let isActive = true;

    let cleanupPush: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        cleanupPush?.();
        cleanupPush = null;

        if (!user) {
          // First time on this phone: ask for a friend's referral code first.
          const signedInBefore =
            await hasSignedInOnThisPhone();

          if (isActive) {
            router.replace(
              // "as any": typed routes don't list new screens until the next dev build.
              (signedInBefore ? "/login" : "/referral") as any
            );
          }

          return;
        }

        markSignedInOnThisPhone();

        if (isActive) {
          initializePushNotifications()
            .then((cleanup) => {
              if (isActive && cleanup) cleanupPush = cleanup;
            })
            .catch((error) => {
              console.warn("[RootLayout] Push notification init error:", error);
            });

          router.replace("/home");
        }
      }
    );

    return () => {
      isActive = false;

      cleanupPush?.();

      unsubscribe();
    };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }} />
  );
}