import type { User as FirebaseUser } from "firebase/auth";
import { doc, runTransaction } from "firebase/firestore";
import * as Application from "expo-application";
import { Platform } from "react-native";

import { api } from "./api";
import { auth, db } from "./firebase";

// Shown in the app; the server decides the real amount (backend/free_scans.py).
export const FREE_SCANS = 25;

type AuthProvider = "email" | "google";

// Must match isValidNewUser() in backend/firestore.rules.
function buildNewUserDocument(
  user: FirebaseUser,
  authProvider: AuthProvider,
  name?: string
) {
  const now = Date.now();

  return {
    uid: user.uid,
    name:
      name?.trim() ||
      user.displayName ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email || "",
    photoURL: user.photoURL || "",
    packId: "free",
    packName: "Free Plan",
    // Free scans are added by the server after the email is verified.
    totalScans: 0,
    usedScans: 0,
    freeScansStatus: "pending",
    exportsGenerated: 0,
    subscriptionActive: false,
    subscriptionExpiry: null,
    authProvider,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates the user's Firestore profile if it doesn't exist yet.
 * Safe to call from several places at once (signup, Google login, home screen):
 * only the first call creates it, and it never touches credits on an existing account.
 */
export async function ensureUserDocument(
  user: FirebaseUser,
  authProvider: AuthProvider,
  name?: string
): Promise<void> {
  const userRef = doc(db, "users", user.uid);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);

    if (snapshot.exists()) {
      return;
    }

    transaction.set(
      userRef,
      buildNewUserDocument(user, authProvider, name)
    );
  });
}

async function getDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === "android") {
      return Application.getAndroidId();
    }

    if (Platform.OS === "ios") {
      return await Application.getIosIdForVendorAsync();
    }
  } catch {
    // Handled below.
  }

  return null;
}

export type FreeScansResult =
  | "granted"
  | "already_used"
  | "not_eligible"
  | "email_not_verified"
  | "error";

/**
 * Asks the server for the welcome free scans. The server only gives them
 * once per phone and once per email, and only to verified emails.
 */
export async function claimFreeScans(): Promise<FreeScansResult> {
  const user = auth.currentUser;

  if (!user) {
    return "error";
  }

  try {
    // Pick up a verification the user just did in their email app.
    await user.reload();

    if (!user.emailVerified) {
      return "email_not_verified";
    }

    // The token must say email_verified=true, so get a fresh one.
    await user.getIdToken(true);

    const deviceId = await getDeviceId();

    if (!deviceId) {
      return "error";
    }

    const response = await api.post("/account/claim-free-scans", {
      deviceId,
    });

    const status = response.data?.status;

    if (status === "granted" || status === "already_used") {
      return status;
    }

    return "not_eligible";
  } catch (error: any) {
    if (error?.response?.data?.detail?.code === "EMAIL_NOT_VERIFIED") {
      return "email_not_verified";
    }

    console.warn("[FreeScans] Claim failed:", error?.message);
    return "error";
  }
}
