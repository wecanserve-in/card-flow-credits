
import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../services/firebase";

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          router.replace("/home");
        } else {
          router.replace("/login");
        }
      }
    );

    return unsubscribe;
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}