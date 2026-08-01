import * as WebBrowser from "expo-web-browser";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { auth, db } from "./firebase";

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

function buildGoogleUserDocument(user) {
  const displayName = user.displayName || user.email?.split("@")[0] || "User";

  return {
    uid: user.uid,
    name: displayName,
    email: user.email || "",
    photoURL: user.photoURL || "",
    packId: "free",
packName: "Free Plan",

totalScans: 5,
usedScans: 0,
remainingScans: 5,

exportsGenerated: 0,

subscriptionActive: false,
subscriptionExpiry: null,
    exportsGenerated: 0,
    subscriptionActive: false,
    subscriptionExpiry: null,
    authProvider: "google",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

async function syncGoogleUser(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) {
    await setDoc(
      userRef,
      {
        name: user.displayName || user.email?.split("@")[0] || "User",
        email: user.email || "",
        photoURL: user.photoURL || "",
        authProvider: "google",
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    return;
  }

  await setDoc(userRef, buildGoogleUserDocument(user));
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