import * as Device from "expo-device";
import Constants, {
  ExecutionEnvironment,
} from "expo-constants";
import { Platform } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { router } from "expo-router";

import { auth, db } from "./firebase";

type NotificationsModule = typeof import("expo-notifications");
type NotificationsType = import("expo-notifications").Notification;

let cachedNotifications:
  | NotificationsModule
  | null
  | undefined;

/**
 * Lazily loads expo-notifications.
 *
 * The push native module is not bundled in Expo Go on
 * Android from SDK 53, so any import throws. Avoid loading
 * the module at all in that environment and gracefully
 * disable push notifications.
 */
async function getNotifications(): Promise<NotificationsModule | null> {
  if (cachedNotifications !== undefined) {
    return cachedNotifications;
  }

  if (
    Platform.OS === "android" &&
    Constants.executionEnvironment ===
      ExecutionEnvironment.StoreClient
  ) {
    console.warn(
      "[Push] Push notifications are unavailable in Expo Go on Android. Push notifications are disabled."
    );

    cachedNotifications = null;

    return cachedNotifications;
  }

  try {
    const notificationsModule =
      await import("expo-notifications");

    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    cachedNotifications = notificationsModule;
  } catch (error) {
    console.warn(
      "[Push] expo-notifications is unavailable in this environment. Push notifications are disabled."
    );

    cachedNotifications = null;
  }

  return cachedNotifications;
}

function getNotificationUrl(
  notification: NotificationsType
): string | null {
  const data = notification.request.content.data;

  const url =
    typeof data?.actionRoute === "string"
      ? data.actionRoute
      : typeof data?.url === "string"
      ? data.url
      : null;

  return url;
}

async function savePushTokenToUser(
  token: string
) {
  const user = auth.currentUser;

  if (!user) {
    console.log(
      "[Push] Token skipped because no user is authenticated."
    );

    return;
  }

  try {
    await updateDoc(
      doc(db, "users", user.uid),
      {
        expoPushToken: token,
        pushTokenUpdatedAt: Date.now(),
      }
    );

    console.log(
      "[Push] Expo push token saved to user document."
    );
  } catch (error) {
    console.error(
      "[Push] Failed to save Expo push token:",
      error
    );
  }
}

async function registerPushTokenListener(
  Notifications: NotificationsModule
) {
  return Notifications.addPushTokenListener(
    (token) => {
      savePushTokenToUser(token.data);
    }
  );
}

async function registerResponseListener(
  Notifications: NotificationsModule
) {
  return Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const url = getNotificationUrl(
        response.notification
      );

      if (url) {
        router.push(url as any);
      }
    }
  );
}

export async function registerForPushNotificationsAsync() {
  const Notifications = await getNotifications();

  if (!Notifications) {
    return null;
  }

  if (!Device.isDevice) {
    console.log(
      "Push notifications require a physical device."
    );

    return null;
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log(
        "Push notification permission was not granted."
      );

      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        "default",
        {
          name: "default",
          importance:
            Notifications.AndroidImportance.MAX,
          vibrationPattern: [
            0, 250, 250, 250,
          ],
        }
      );
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.error("EAS projectId is missing.");

      return null;
    }

    const token =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    console.log("Expo Push Token:", token.data);

    return token.data;
  } catch (error) {
    console.error(
      "[Push] Failed to register for push notifications:",
      error
    );

    return null;
  }
}

export async function initializePushNotifications() {
  const Notifications = await getNotifications();

  if (!Notifications) {
    return null;
  }

  const token =
    await registerForPushNotificationsAsync();

  if (token) {
    await savePushTokenToUser(token);
  }

  const tokenListener =
    await registerPushTokenListener(
      Notifications
    );

  const responseListener =
    await registerResponseListener(
      Notifications
    );

  try {
    const lastResponse =
      typeof Notifications.getLastNotificationResponseAsync === "function"
        ? await Notifications.getLastNotificationResponseAsync()
        : null;

    if (lastResponse?.notification) {
      const url = getNotificationUrl(
        lastResponse.notification
      );

      if (url) {
        setTimeout(() => {
          router.push(url as any);
        }, 300);
      }
    }
  } catch (error) {
    console.warn(
      "[Push] Failed to check initial notification response:",
      error
    );
  }

  return () => {
    tokenListener.remove();
    responseListener.remove();
  };
}