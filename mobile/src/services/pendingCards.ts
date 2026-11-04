import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { auth } from "./firebase";

/**
 * Cards the user hasn't saved yet: photos waiting in the scan queue and
 * extracted cards waiting on the review screen.
 *
 * Screens read and write them through `globalThis` (fast, same as before);
 * this module also keeps a copy on the phone so they survive Android closing
 * the app (a phone call, switching to WhatsApp or a UPI app, low memory).
 * Photos are moved out of the cache folder, which Android may empty.
 */

type Pending = {
  images: string[];
  orientations: Record<string, string>;
  extracted: any[];
};

const DIR = `${FileSystem.documentDirectory}pending-cards/`;

const storageKey = () => {
  const uid = auth.currentUser?.uid;
  return uid ? `ScanMyCard_PENDING_${uid}` : null;
};

const g = globalThis as any;

const current = (): Pending => ({
  images: Array.isArray(g.scannedImages) ? g.scannedImages : [],
  orientations: g.scannedCardOrientations || {},
  extracted: Array.isArray(g.extractedCards) ? g.extractedCards : [],
});

async function persist() {
  const key = storageKey();
  if (!key) return;
  try {
    await AsyncStorage.setItem(key, JSON.stringify(current()));
  } catch {
    // Saving the copy is best effort; the cards are still on screen.
  }
}

/** Copies a cached photo into the app's own folder and returns the new path. */
async function keepFile(uri: string): Promise<string> {
  if (!uri || uri.startsWith(DIR) || !uri.startsWith("file:")) return uri;
  try {
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: DIR + name });
    return DIR + name;
  } catch {
    return uri;
  }
}

/** Removes kept photos that are no longer in the queue or on any unsaved card. */
async function cleanFiles() {
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) return;
    const { images, extracted } = current();
    const inUse = new Set([...images, ...extracted.map((c) => c?.sourceUri).filter(Boolean)]);
    const files = await FileSystem.readDirectoryAsync(DIR);
    await Promise.all(
      files
        .filter((f) => !inUse.has(DIR + f))
        .map((f) => FileSystem.deleteAsync(DIR + f, { idempotent: true }))
    );
  } catch {
    // Leftover files are harmless.
  }
}

/**
 * Sets the scan queue. Photos are copied to safe storage first; returns the
 * list with the safe paths (orientations are carried over to the new paths).
 */
export async function setQueue(images: string[], orientations?: Record<string, string>) {
  const source = orientations || g.scannedCardOrientations || {};
  const kept = await Promise.all(images.map(keepFile));
  const nextOrientations: Record<string, string> = {};
  kept.forEach((uri, i) => {
    const o = source[images[i]] || source[uri];
    if (o) nextOrientations[uri] = o;
  });
  g.scannedImages = kept;
  g.scannedCardOrientations = nextOrientations;
  await persist();
  cleanFiles();
  return kept;
}

/** Sets the extracted cards waiting to be reviewed and saved. */
export async function setExtracted(cards: any[]) {
  g.extractedCards = cards;
  await persist();
  cleanFiles();
}

/** Adds newly extracted cards after any that are still waiting to be saved. */
export async function addExtracted(cards: any[]) {
  await setExtracted([...current().extracted, ...cards]);
}

export const pendingCount = () => current().extracted.length;

/**
 * Puts back the unsaved cards from the phone after the app was closed.
 * Does nothing if the screens already have cards in memory.
 */
export async function restorePending() {
  const key = storageKey();
  if (!key) return;
  const { images, extracted } = current();
  if (images.length > 0 || extracted.length > 0) return;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;
    const saved: Pending = JSON.parse(raw);
    const exists = async (uri: string) =>
      !uri?.startsWith("file:") || (await FileSystem.getInfoAsync(uri)).exists;
    const checks = await Promise.all((saved.images || []).map(exists));
    g.scannedImages = (saved.images || []).filter((_, i) => checks[i]);
    g.scannedCardOrientations = saved.orientations || {};
    g.extractedCards = Array.isArray(saved.extracted) ? saved.extracted : [];
  } catch {
    // Nothing to restore.
  }
}

/** Forgets unsaved cards and the cached My Cards list (sign-out or account deletion). */
export async function clearPending() {
  const key = storageKey();
  g.scannedImages = [];
  g.scannedCardOrientations = {};
  g.extractedCards = [];
  g.selectedContact = undefined;
  const uid = auth.currentUser?.uid;
  try {
    if (key) await AsyncStorage.removeItem(key);
    // The phone's copy of My Cards, so the next person on a shared phone can't see it.
    if (uid) await AsyncStorage.removeItem(`ScanMyCard_CONTACTS_${uid}`);
    await FileSystem.deleteAsync(DIR, { idempotent: true });
  } catch {
    // Ignore.
  }
}
