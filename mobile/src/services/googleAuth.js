import * as WebBrowser from "expo-web-browser";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { auth, db } from "./firebase";
import { ensureUserDocument } from "./userService";

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "126413727192-vhri6psu4k7eibnp4a939rpni7d2r1ok.apps.googleusercontent.com";

let isGoogleSigninConfigured = false;

function configureGoogleSignin() {
  if (isGoogleSigninConfigured) {
    return;
  }

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  isGoogleSigninConfigured = true;
}

async function syncGoogleUser(user) {
  await ensureUserDocument(user, "google");

  // Name and photo are left alone so edits made in the app aren't overwritten.
  await setDoc(
    doc(db, "users", user.uid),
    {
      email: user.email || "",
      authProvider: "google",
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

export async function signInWithGoogle() {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error("Google sign-in is not configured.");
  }

  configureGoogleSignin();

  const hasPlayServices = await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  });

  if (!hasPlayServices) {
    throw new Error("Google Play Services are required to continue.");
  }

  const response = await GoogleSignin.signIn();

  if (response.type !== "success") {
    return null;
  }

  const { idToken } = response.data;

  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);

  await syncGoogleUser(userCredential.user);

  return userCredential;
}