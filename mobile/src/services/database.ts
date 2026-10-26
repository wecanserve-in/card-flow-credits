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
} from "firebase/firestore";

import { encryptData, decryptData } from "./crypto";

/* =====================================================
   DUPLICATE HELPERS
===================================================== */

let existingEmails = new Set<string>();
let existingPhones = new Set<string>();

const normalizeEmail = (email?: string) =>
  email?.trim().toLowerCase() || "";

const normalizePhone = (phone?: string) =>
  (phone || "").replace(/\D/g, "").slice(-10);

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

export async function saveContacts(
  newContacts: any[]
) {
  try {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      return false;
    }

    const STORAGE_KEY =
      getStorageKey();

    /* =================================================
       IMPORTANT:
       Rebuild duplicate cache ONLY
       for the CURRENT Firebase user
    ================================================= */

    const contactsRef =
      collection(
        db,
        "users",
        uid,
        "contacts"
      );

    const snapshot =
      await getDocs(contactsRef);

    /* =================================================
       CLEAR PREVIOUS USER CACHE

       This is the important fix.
       If User A logs out and User B logs in,
       User A's email/phone values will not remain.
    ================================================= */

    existingEmails.clear();
    existingPhones.clear();

    const existingContacts: any[] = [];

    snapshot.docs.forEach(
      (document) => {
        const data =
          document.data();

        const encrypted =
          data.encryptedData;

        if (!encrypted) {
          return;
        }

        const contact =
          decryptData(encrypted);

        if (!contact) {
          return;
        }

        const legacyFolderId =
          data.folderId || null;

        const folderIds =
          Array.isArray(
            data.folderIds
          )
            ? data.folderIds
            : legacyFolderId
              ? [legacyFolderId]
              : [];

        const existingContact = {
          id: document.id,

          updatedAt:
            data.updatedAt || 0,

          folderIds,

          ...contact,
        };

        existingContacts.push(
          existingContact
        );

        /* =============================================
           Build duplicate cache for THIS UID ONLY
        ============================================= */

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
       SAVE NEW CONTACTS
    ================================================= */

    const contactsToSave: any[] = [];

    for (
      const contact of newContacts
    ) {
      const email =
        normalizeEmail(
          contact.email
        );

      const phone =
        normalizePhone(
          contact.phone
        );

      /* ===============================================
         DUPLICATE CHECK

         This now checks ONLY contacts belonging
         to the currently logged-in Firebase user.
      =============================================== */

      const duplicate =
        (email &&
          existingEmails.has(
            email
          )) ||
        (phone &&
          existingPhones.has(
            phone
          ));

      if (duplicate) {
        continue;
      }

      /* ===============================================
         ENCRYPT CONTACT
      =============================================== */

      const encrypted =
        encryptData(contact);

      /* ===============================================
         DOCUMENT ID

         Email → phone → random ID
      =============================================== */

      const documentId =
        email ||
        phone ||
        `contact_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 8)}`;

      /* ===============================================
         SAVE TO FIRESTORE
      =============================================== */

      await setDoc(
        doc(
          db,
          "users",
          uid,
          "contacts",
          documentId
        ),
        {
          encryptedData:
            encrypted,

          updatedAt:
            Date.now(),
        }
      );

      /* ===============================================
         UPDATE CACHE IMMEDIATELY

         Prevents duplicates inside the SAME
         scanning batch.
      =============================================== */

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

      contactsToSave.push({
        id: documentId,

        ...contact,

        updatedAt:
          Date.now(),

        folderIds: [],
      });
    }

    /* =================================================
       UPDATE ASYNC STORAGE

       IMPORTANT:
       Storage key contains Firebase UID.
    ================================================= */

    if (
      contactsToSave.length > 0
    ) {
      const updatedContacts = [
        ...contactsToSave,
        ...existingContacts,
      ];

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          updatedContacts
        )
      );

    } else {
      /* ===============================================
         No new contacts saved.
         Still refresh local cache.
      =============================================== */

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          existingContacts
        )
      );
    }

    return true;
  } catch (error: any) {
    console.error(
      "[Database] Save contacts error:", error?.code || error?.message
    );

    throw error;
  }
}

/* =====================================================
   GET CONTACTS
===================================================== */

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

    await AsyncStorage.setItem(
      getStorageKey(),
      JSON.stringify(
        contacts
      )
    );

    return contacts;
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
        ? JSON.parse(cache)
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

    return true;
  } catch (error) {
    console.error(
      "[Database] Set contact folders error:",
      (error as any)?.code || (error as any)?.message
    );

    throw error;
  }
}