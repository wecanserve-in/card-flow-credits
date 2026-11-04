import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "./firebase";

import {
  collection,
  getDocs,
  setDoc,
  writeBatch,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  deleteDoc,
} from "firebase/firestore";

import { encryptData, decryptData } from "./crypto";
import { hasValue, splitPhones } from "../utils/contactActions";

/* =====================================================
   DUPLICATE HELPERS
===================================================== */

let existingEmails = new Set<string>();
let existingPhones = new Set<string>();

// "Not available" etc. must never count as an email or phone, or every card
// without an email would look like a duplicate of every other one.
const normalizeEmail = (email?: string) =>
  hasValue(email) ? email.trim().toLowerCase() : "";

const normalizePhone = (phone?: string) => {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 7 ? digits.slice(-10) : "";
};

/**
 * The card's personal numbers, used to spot duplicates: Indian mobiles
 * (10 digits starting 6-9) and foreign numbers written with a country code.
 * Office landlines and toll-free numbers are left out, because colleagues
 * often share them and would wrongly look like the same person.
 */
const normalizePhones = (phone?: string) =>
  splitPhones(phone)
    .map((part) => {
      const written = part.trim();
      // Indian toll-free / shared business numbers (1800..., 1860...).
      if (/^(1800|1860)/.test(written.replace(/\D/g, ""))) return "";
      const last10 = normalizePhone(written);
      if (!last10) return "";
      const foreign = written.startsWith("+") && !written.replace(/\s/g, "").startsWith("+91");
      return foreign || /^[6-9]\d{9}$/.test(last10) ? last10 : "";
    })
    .filter(Boolean);

/** Shared mailboxes (info@, sales@...) say nothing about which person it is. */
const ROLE_MAILBOXES = new Set([
  "info", "sales", "contact", "office", "admin", "enquiry", "enquiries", "inquiry",
  "hello", "support", "export", "exports", "marketing", "accounts", "hr", "mail",
  "care", "customercare", "service", "team", "business",
]);

const duplicateEmail = (email?: string) => {
  const normalized = normalizeEmail(email);
  return normalized && !ROLE_MAILBOXES.has(normalized.split("@")[0]) ? normalized : "";
};

/** Fields the user adds after saving; kept when a card is re-saved. */
const USER_FIELDS = ["notes", "tags"];

/* =====================================================
   STORAGE
===================================================== */

const getStorageKey = () => {
  const uid = auth.currentUser?.uid;

  if (!uid) {
    return "ScanMyCard_GUEST";
  }

  return `ScanMyCard_CONTACTS_${uid}`;
};

/* =====================================================
   CONTACTS
===================================================== */

export type SaveResult = {
  saved: number;
  updated: number;
  skipped: number;
  // Contacts written (new or updated), with the folders they already had.
  written: { id: string; folderIds: string[] }[];
};

/** Index of saved contacts by email and by every phone number. */
function buildDuplicateIndex(existingContacts: any[]) {
  const byKey = new Map<string, any>();

  existingEmails.clear();
  existingPhones.clear();

  for (const contact of existingContacts) {
    const email = duplicateEmail(contact.email);

    if (email) {
      existingEmails.add(email);
      byKey.set(`e:${email}`, contact);
    }

    for (const phone of normalizePhones(contact.phone)) {
      existingPhones.add(phone);
      byKey.set(`p:${phone}`, contact);
    }
  }

  return byKey;
}

function findMatch(byKey: Map<string, any>, contact: any) {
  const email = duplicateEmail(contact.email);

  if (email && byKey.has(`e:${email}`)) {
    return byKey.get(`e:${email}`);
  }

  for (const phone of normalizePhones(contact.phone)) {
    if (byKey.has(`p:${phone}`)) {
      return byKey.get(`p:${phone}`);
    }
  }

  return null;
}

/** The decrypted fields only (no id / folderIds / updatedAt). */
function contactFields(contact: any) {
  const { id, folderIds, updatedAt, folderId, sourceUri, unreadable, ...fields } =
    contact || {};
  return fields;
}

/**
 * For each new contact: the already-saved contact it duplicates (same email or
 * any same phone number), or null.
 */
export async function findDuplicates(newContacts: any[]): Promise<(any | null)[]> {
  const existing = await getContacts();
  const byKey = buildDuplicateIndex(existing);
  return newContacts.map((contact) => findMatch(byKey, contact));
}

/**
 * Saves new contacts. Duplicates of saved contacts (same email or phone) are
 * skipped, or with `replaceDuplicates` the saved contact is updated with the new
 * card's details (keeping its notes, tags and folders).
 */
export async function saveContacts(
  newContacts: any[],
  options: { replaceDuplicates?: boolean } = {}
): Promise<SaveResult> {
  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error("Please sign in again.");
  }

  const result: SaveResult = { saved: 0, updated: 0, skipped: 0, written: [] };

  try {
    const existingContacts = await getContacts();
    const byKey = buildDuplicateIndex(existingContacts);
    const now = Date.now();

    for (const contact of newContacts) {
      const fields = contactFields(contact);
      const match = findMatch(byKey, fields);

      if (match && !options.replaceDuplicates) {
        result.skipped += 1;
        continue;
      }

      let documentId: string;
      let toStore: any;

      if (match) {
        documentId = match.id;

        const kept: any = {};
        for (const key of USER_FIELDS) {
          if (match[key] !== undefined) {
            kept[key] = match[key];
          }
        }

        toStore = { ...contactFields(match), ...fields, ...kept };
        result.updated += 1;
      } else {
        documentId = `contact_${now}_${Math.random().toString(36).substring(2, 10)}`;
        toStore = fields;
        result.saved += 1;
      }

      // merge: keeps the contact's folders when an existing one is updated.
      await setDoc(
        doc(db, "users", uid, "contacts", documentId),
        { encryptedData: encryptData(toStore), updatedAt: now },
        { merge: true }
      );

      result.written.push({ id: documentId, folderIds: match?.folderIds || [] });

      // Later cards in the same batch are checked against this one too.
      const stored = { id: documentId, folderIds: match?.folderIds || [], ...toStore };
      const email = duplicateEmail(stored.email);
      if (email) byKey.set(`e:${email}`, stored);
      for (const phone of normalizePhones(stored.phone)) byKey.set(`p:${phone}`, stored);
    }

    // Refresh the local cache from the server copy.
    await getContacts();

    return result;
  } catch (error: any) {
    console.error("[Database] Save contacts error:", error?.code || error?.message);
    throw error;
  }
}

/** Saves edits to one saved contact (details, notes, tags). Folders are untouched. */
export async function updateContact(contact: any) {
  const uid = auth.currentUser?.uid;

  if (!uid || !contact?.id) {
    throw new Error("This contact can't be updated.");
  }

  const fields = contactFields(contact);
  const now = Date.now();

  await setDoc(
    doc(db, "users", uid, "contacts", contact.id),
    { encryptedData: encryptData(fields), updatedAt: now },
    { merge: true }
  );

  // Keep the offline cache in step.
  try {
    const key = getStorageKey();
    const cached = JSON.parse((await AsyncStorage.getItem(key)) || "[]");
    const updated = Array.isArray(cached)
      ? cached.map((item: any) =>
          item?.id === contact.id ? { ...item, ...fields, updatedAt: now } : item
        )
      : [];
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // The cache refreshes on the next load anyway.
  }

  return { ...contact, ...fields, updatedAt: now };
}

/* =====================================================
   GET CONTACTS
===================================================== */

/** When a contact was first saved (from its id, e.g. "contact_1730000000000_ab12"). */
export function addedAt(contact: any): number {
  const fromId = Number(String(contact?.id || "").split("_")[1]);
  return Number.isFinite(fromId) && fromId > 0 ? fromId : Number(contact?.updatedAt) || 0;
}

const newestFirst = (list: any[]) =>
  [...list].sort((a, b) => addedAt(b) - addedAt(a));

let lastServerFetch = 0;

/** True when My Cards was read from the server within the last few minutes. */
export const contactsFetchedRecently = (withinMs = 5 * 60 * 1000) =>
  Date.now() - lastServerFetch < withinMs;

/** The contacts saved on this phone last time (instant, may be slightly out of date). */
export async function getCachedContacts(): Promise<any[]> {
  try {
    if (!auth.currentUser?.uid) return [];
    const cache = await AsyncStorage.getItem(getStorageKey());
    return cache ? newestFirst(JSON.parse(cache)) : [];
  } catch {
    return [];
  }
}

export async function getContacts() {
  try {
    const uid =
      auth.currentUser?.uid;

    if (!uid) {
      return [];
    }

    /* =================================================
       CLEAR OLD USER CACHE

       Important when switching accounts.
    ================================================= */

    existingEmails.clear();
    existingPhones.clear();

    const contactsRef =
      collection(
        db,
        "users",
        uid,
        "contacts"
      );

    const snapshot =
      await getDocs(
        contactsRef
      );

    const contacts =
      snapshot.docs
        .map(
          (document) => {
            const rawData =
              document.data();

            const encrypted =
              rawData.encryptedData;

            if (!encrypted) {
              return null;
            }

            const contact =
              decryptData(
                encrypted
              );

            if (!contact) {
              return null;
            }

            const legacyFolderId =
              rawData.folderId ||
              null;

            const folderIds =
              Array.isArray(
                rawData.folderIds
              )
                ? rawData.folderIds
                : legacyFolderId
                  ? [legacyFolderId]
                  : [];

            return {
              id: document.id,

              updatedAt:
                rawData.updatedAt ||
                0,

              folderIds,

              ...contact,
            };
          }
        )
        .filter(Boolean);

    /* =================================================
       REBUILD DUPLICATE CACHE
       FOR CURRENT USER ONLY
    ================================================= */

    contacts.forEach(
      (contact: any) => {
        const email =
          normalizeEmail(
            contact.email
          );

        const phone =
          normalizePhone(
            contact.phone
          );

        if (email) {
          existingEmails.add(
            email
          );
        }

        if (phone) {
          existingPhones.add(
            phone
          );
        }
      }
    );

    /* =================================================
       SAVE CURRENT USER CONTACTS
       TO CURRENT USER STORAGE KEY
    ================================================= */

    const sorted = newestFirst(contacts);
    lastServerFetch = Date.now();

    try {
      await AsyncStorage.setItem(getStorageKey(), JSON.stringify(sorted));
    } catch {
      // Cache is only a speed-up; a full phone storage must not hide fresh data.
    }

    return sorted;
  } catch (error) {
    console.error(
      "[Database] Read contacts error:",
      (error as any)?.code || (error as any)?.message
    );

    /* =================================================
       FALLBACK TO CURRENT USER'S CACHE ONLY
    ================================================= */

    try {
      const cache =
        await AsyncStorage.getItem(
          getStorageKey()
        );

      return cache
        ? newestFirst(JSON.parse(cache))
        : [];
    } catch {
      return [];
    }
  }
}

/* =====================================================
   DELETE CONTACTS
===================================================== */

// Firestore allows at most 500 writes per batch.
const DELETE_BATCH_SIZE = 500;

/**
 * Permanently delete one or more saved contacts
 * for the currently logged-in user.
 *
 * Documents are deleted directly by id (no full
 * collection read). The duplicate-check sets are
 * rebuilt from the remaining cached contacts.
 */
export async function deleteContacts(
  contactIds: string[]
) {
  try {
    const uid =
      auth.currentUser?.uid;

    if (!uid) {
      throw new Error(
        "User not logged in"
      );
    }

    const normalizedIds =
      Array.isArray(contactIds)
        ? Array.from(
            new Set(
              contactIds.filter(Boolean)
            )
          )
        : [];

    if (
      normalizedIds.length === 0
    ) {
      return true;
    }

    for (
      let start = 0;
      start < normalizedIds.length;
      start += DELETE_BATCH_SIZE
    ) {
      const batch = writeBatch(db);

      normalizedIds
        .slice(
          start,
          start + DELETE_BATCH_SIZE
        )
        .forEach((contactId) => {
          batch.delete(
            doc(
              db,
              "users",
              uid,
              "contacts",
              contactId
            )
          );
        });

      await batch.commit();
    }

    /* =================================================
       UPDATE LOCAL CACHE + DUPLICATE SETS
    ================================================= */

    const deletedIds =
      new Set(normalizedIds);

    const storageKey =
      getStorageKey();

    let remaining: any[] | null =
      null;

    try {
      const cached =
        await AsyncStorage.getItem(
          storageKey
        );

      const parsed = cached
        ? JSON.parse(cached)
        : null;

      if (Array.isArray(parsed)) {
        remaining = parsed.filter(
          (contact: any) =>
            !deletedIds.has(
              contact?.id
            )
        );

        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify(
            remaining
          )
        );
      }
    } catch {
      remaining = null;
    }

    /*
     * Rebuild the duplicate sets from what is left.
     * If the cache was unavailable, just reset them:
     * saveContacts() rebuilds them from Firestore
     * before every save anyway.
     */
    existingEmails.clear();
    existingPhones.clear();

    remaining?.forEach(
      (contact: any) => {
        const email =
          normalizeEmail(
            contact?.email
          );

        const phone =
          normalizePhone(
            contact?.phone
          );

        if (email) {
          existingEmails.add(email);
        }

        if (phone) {
          existingPhones.add(phone);
        }
      }
    );

    return true;
  } catch (error: any) {
    console.error(
      "[Database] Delete contacts error:",
      error?.code || error?.message
    );

    throw error;
  }
};


/* =====================================================
   FOLDERS
===================================================== */

export type FolderItem = {
  id: string;
  name: string;
  createdAt: number;
};

/* =====================================================
   CREATE FOLDER
===================================================== */

/**
 * Create a new folder for the
 * currently logged-in user.
 */
export async function createFolder(
  name: string
) {
  try {
    const uid =
      auth.currentUser?.uid;

    if (!uid) {
      throw new Error(
        "User not logged in"
      );
    }

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      throw new Error(
        "Folder name is required"
      );
    }

    const foldersRef =
      collection(
        db,
        "users",
        uid,
        "folders"
      );

    /* ===============================================
       Check duplicate folder names
    =============================================== */

    const existingSnapshot =
      await getDocs(
        foldersRef
      );

    const duplicate =
      existingSnapshot.docs.some(
        (document) => {
          const existingName =
            document.data().name;

          return (
            typeof existingName ===
              "string" &&
            existingName
              .trim()
              .toLowerCase() ===
              trimmedName.toLowerCase()
          );
        }
      );

    if (duplicate) {
      throw new Error(
        "A folder with this name already exists"
      );
    }

    const createdAt =
      Date.now();

    const folderRef =
      await addDoc(
        foldersRef,
        {
          name:
            trimmedName,

          createdAt,
        }
      );

    return {
      id: folderRef.id,

      name:
        trimmedName,

      createdAt,
    };
  } catch (error) {
    console.error(
      "[Database] Create folder error:",
      (error as any)?.code || (error as any)?.message
    );

    throw error;
  }
}

/* =====================================================
   GET FOLDERS
===================================================== */

/**
 * Get all folders belonging
 * to the currently logged-in user.
 */
export async function getFolders() {
  try {
    const uid =
      auth.currentUser?.uid;

    if (!uid) {
      return [];
    }

    const foldersRef =
      collection(
        db,
        "users",
        uid,
        "folders"
      );

    const foldersQuery =
      query(
        foldersRef,
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const snapshot =
      await getDocs(
        foldersQuery
      );

    return snapshot.docs.map(
      (document) => ({
        id: document.id,

        name:
          document.data().name ||
          "Unnamed Folder",

        createdAt:
          document.data()
            .createdAt || 0,
      })
    );
  } catch (error) {
    console.error(
      "[Database] Get folders error:",
      (error as any)?.code || (error as any)?.message
    );

    return [];
  }
}

/* =====================================================
   SET CONTACT FOLDERS
===================================================== */

/**
 * Set the folders a saved contact
 * belongs to.
 *
 * A contact can be part of
 * multiple folders at the same time.
 *
 * Pass an empty array to keep the
 * contact in "My Cards" only.
 */
export async function setContactFolders(
  contactId: string,
  folderIds: string[]
) {
  try {
    const uid =
      auth.currentUser?.uid;

    if (!uid) {
      throw new Error(
        "User not logged in"
      );
    }

    if (!contactId) {
      throw new Error(
        "Contact id is required"
      );
    }

    const normalizedFolderIds =
      Array.isArray(folderIds)
        ? folderIds.filter(Boolean)
        : [];

    const contactRef =
      doc(
        db,
        "users",
        uid,
        "contacts",
        contactId
      );

    await updateDoc(
      contactRef,
      {
        folderIds:
          normalizedFolderIds,

        folderId:
          normalizedFolderIds[0] ||
          null,

        updatedAt:
          Date.now(),
      }
    );

    await patchCachedContacts((contact) =>
      contact?.id === contactId
        ? { ...contact, folderIds: normalizedFolderIds }
        : contact
    );

    return true;
  } catch (error) {
    console.error(
      "[Database] Set contact folders error:",
      (error as any)?.code || (error as any)?.message
    );

    throw error;
  }
}

/** Applies a change to every contact in the phone's copy of My Cards. */
async function patchCachedContacts(change: (contact: any) => any) {
  try {
    const key = getStorageKey();
    const cached = JSON.parse((await AsyncStorage.getItem(key)) || "[]");
    await AsyncStorage.setItem(key, JSON.stringify(cached.map(change)));
  } catch {
    // The copy refreshes from the server later anyway.
  }
}

/** Renames a folder (names stay unique, ignoring case). */
export async function renameFolder(folderId: string, name: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User not logged in");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Folder name is required");

  const folders = await getDocs(collection(db, "users", uid, "folders"));
  const taken = folders.docs.some(
    (d) =>
      d.id !== folderId &&
      String(d.data().name || "").trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (taken) throw new Error("A folder with this name already exists");

  await updateDoc(doc(db, "users", uid, "folders", folderId), { name: trimmed });
  return trimmed;
}

/**
 * Deletes a folder. The contacts inside are NOT deleted: they just leave this
 * folder and stay in My Cards (and any other folders they are in).
 */
export async function deleteFolder(folderId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User not logged in");

  const contactsRef = collection(db, "users", uid, "contacts");
  const inFolder = await getDocs(query(contactsRef, where("folderIds", "array-contains", folderId)));
  const legacy = await getDocs(query(contactsRef, where("folderId", "==", folderId)));
  const docs = new Map([...inFolder.docs, ...legacy.docs].map((d) => [d.id, d]));

  const entries = Array.from(docs.values());
  for (let i = 0; i < entries.length; i += 450) {
    const batch = writeBatch(db);
    for (const d of entries.slice(i, i + 450)) {
      const data = d.data();
      const remaining = (Array.isArray(data.folderIds) ? data.folderIds : [data.folderId])
        .filter((id: string) => id && id !== folderId);
      batch.update(d.ref, { folderIds: remaining, folderId: remaining[0] || null, updatedAt: Date.now() });
    }
    await batch.commit();
  }

  await deleteDoc(doc(db, "users", uid, "folders", folderId));

  await patchCachedContacts((contact) =>
    Array.isArray(contact?.folderIds) && contact.folderIds.includes(folderId)
      ? { ...contact, folderIds: contact.folderIds.filter((id: string) => id !== folderId) }
      : contact
  );

  return entries.length;
}
