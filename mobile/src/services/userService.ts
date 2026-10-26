import type { User as FirebaseUser } from "firebase/auth";
import { doc, runTransaction } from "firebase/firestore";

import { db } from "./firebase";

export const FREE_SCANS = 5;

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
    totalScans: FREE_SCANS,
    usedScans: 0,
    exportsGenerated: 0,
    subscriptionActive: false,
    subscriptionExpiry: null,
    authProvider,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates the user's Firestore profile with the free plan if it doesn't exist yet.
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
