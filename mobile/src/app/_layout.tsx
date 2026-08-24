import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../services/firebase";
import { initializePushNotifications } from "../services/notifications";

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
          if (isActive) {
            router.replace("/login");
          }

          return;
        }

        if (isActive) {
          initializePushNotifications().then((cleanup) => {
            if (isActive) cleanupPush = cleanup;
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