import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "./firebase";

import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
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
      console.log("❌ No logged-in user");
      return false;
    }

    console.log(
      "========== SAVE START =========="
    );

    console.log(
      "Current UID:",
      uid
    );

    console.log(
      "Contacts to save:",
      newContacts
    );

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

    console.log(
      "Existing contacts for UID:",
      uid,
      existingContacts.length
    );

    console.log(
      "Existing emails:",
      Array.from(existingEmails)
    );

    console.log(
      "Existing phones:",
      Array.from(existingPhones)
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
        console.log(
          "⚠️ Duplicate Contact Skipped:",
          email || phone
        );

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

      console.log(
        "✅ Saved Contact:",
        documentId
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

      console.log(
        "✅ AsyncStorage updated:",
        STORAGE_KEY
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

    console.log(
      "========== SAVE COMPLETE =========="
    );

    return true;
  } catch (error: any) {
    console.log(
      "❌ SAVE ERROR"
    );

    console.log(
      error
    );

    console.log(
      error?.code
    );

    console.log(
      error?.message
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

    console.log(
      "========== GET CONTACTS =========="
    );

    console.log(
      "Current UID:",
      uid
    );

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

    console.log(
      "✅ Contacts loaded:",
      contacts.length
    );

    console.log(
      "Storage key:",
      getStorageKey()
    );

    return contacts;
  } catch (error) {
    console.log(
      "❌ Read Error:",
      error
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
   CLEAR CONTACTS
===================================================== */

export async function clearContacts() {
  try {
    const uid =
      auth.currentUser?.uid;

    if (!uid) {
      return;
    }

    console.log(
      "========== CLEAR CONTACTS =========="
    );

    console.log(
      "Current UID:",
      uid
    );

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

    for (
      const document of snapshot.docs
    ) {
      await deleteDoc(
        document.ref
      );
    }

    /* =================================================
       CLEAR CURRENT IN-MEMORY CACHE
    ================================================= */

    existingEmails.clear();
    existingPhones.clear();

    /* =================================================
       CLEAR CURRENT USER'S LOCAL CACHE
    ================================================= */

    await AsyncStorage.removeItem(
      getStorageKey()
    );

    console.log(
      "✅ Contacts cleared"
    );
  } catch (error) {
    console.log(
      "❌ Clear Error:",
      error
    );
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

    console.log(
      "✅ Folder created:",
      folderRef.id
    );

    return {
      id: folderRef.id,

      name:
        trimmedName,

      createdAt,
    };
  } catch (error) {
    console.log(
      "❌ Create Folder Error:",
      error
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
    console.log(
      "❌ Get Folders Error:",
      error
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

    console.log(
      "✅ Contact folders updated:",
      normalizedFolderIds
    );

    return true;
  } catch (error) {
    console.log(
      "❌ Set Contact Folders Error:",
      error
    );

    throw error;
  }
}