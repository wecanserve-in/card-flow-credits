import type { User as FirebaseUser } from "firebase/auth";
import { doc, runTransaction } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { Platform } from "react-native";

import { api } from "./api";
import { auth, db } from "./firebase";

// Shown in the app; the server decides the real amount (backend/free_scans.py).
export const FREE_SCANS = 10;

// Scans a user earns when a friend joins with their referral code (backend/free_scans.py).
export const REFERRAL_BONUS = 10;

const PENDING_REFERRAL_KEY = "pendingReferralCode";

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

    const referralCode = await getPendingReferralCode();

    const response = await api.post("/account/claim-free-scans", {
      deviceId,
      referralCode: referralCode || undefined,
    });

    const status = response.data?.status;

    if (status === "granted" || status === "already_used") {
      // The code has been used (or can't be used any more).
      await setPendingReferralCode(null);
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

/**
 * The friend's code typed at signup. Kept on the phone until the free scans are
 * claimed, which can be later (after the user verifies their email).
 */
export async function setPendingReferralCode(code: string | null): Promise<void> {
  try {
    if (code) {
      await AsyncStorage.setItem(PENDING_REFERRAL_KEY, code);
    } else {
      await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
    }
  } catch {
    // Not critical: the user just won't get the referral bonus applied.
  }
}

async function getPendingReferralCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_REFERRAL_KEY);
  } catch {
    return null;
  }
}

/** Cleans up what the user typed: upper case, no spaces or dashes. */
export function cleanReferralCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

/** Returns true / false, or null if the server couldn't be reached. */
export async function isValidReferralCode(code: string): Promise<boolean | null> {
  try {
    const response = await api.get("/account/referral-check", {
      params: { code: cleanReferralCode(code) },
    });

    return Boolean(response.data?.valid);
  } catch {
    return null;
  }
}

export type ReferralInfo = {
  code: string;
  referralCount: number;
  referralScansEarned: number;
  bonusPerReferral: number;
};

/** The user's own referral code (created by the server the first time). */
export async function getMyReferralInfo(): Promise<ReferralInfo | null> {
  try {
    const response = await api.post("/account/referral-code");
    return response.data as ReferralInfo;
  } catch (error: any) {
    console.warn("[Referral] Could not load code:", error?.message);
    return null;
  }
}
