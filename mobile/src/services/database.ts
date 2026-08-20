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

let existingEmails = new Set<string>();
let existingPhones = new Set<string>();

const normalizeEmail = (email?: string) =>
  email?.trim().toLowerCase() || "";

const normalizePhone = (phone?: string) =>
  (phone || "").replace(/\D/g, "").slice(-10);

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

    if (!uid) return false;

    console.log(
      "========== SAVE START =========="
    );
    console.log("UID:", uid);
    console.log("Contacts:", newContacts);

    const STORAGE_KEY = getStorageKey();

    const existing =
      await AsyncStorage.getItem(
        STORAGE_KEY
      );

    const existingContacts = existing
      ? JSON.parse(existing)
      : [];

    const contactsToSave = [];

    for (const contact of newContacts) {
      const email = normalizeEmail(
        contact.email
      );

      const phone = normalizePhone(
        contact.phone
      );

      const duplicate =
        (email &&
          existingEmails.has(email)) ||
        (phone &&
          existingPhones.has(phone));

      if (duplicate) {
        console.log(
          "Duplicate Contact Skipped"
        );
        continue;
      }

      const encrypted =
        encryptData(contact);

      const documentId =
        email ||
        phone ||
        `contact_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 8)}`;

      await setDoc(
        doc(
          db,
          "users",
          uid,
          "contacts",
          documentId
        ),
        {
          encryptedData: encrypted,
          updatedAt: Date.now(),
        }
      );

      console.log(
        "✅ Saved Contact:",
        documentId
      );

      if (email) {
        existingEmails.add(email);
      }

      if (phone) {
        existingPhones.add(phone);
      }

      contactsToSave.push(contact);
    }

    if (contactsToSave.length > 0) {
      const updatedContacts = [
        ...contactsToSave,
        ...existingContacts,
      ];

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedContacts)
      );
    }

    return true;
  } catch (error: any) {
    console.log("❌ SAVE ERROR");
    console.log(error);
    console.log(error?.code);
    console.log(error?.message);

    throw error;
  }
}

export async function getContacts() {
  try {
    const uid = auth.currentUser?.uid;

    if (!uid) return [];

    const snapshot = await getDocs(
      collection(
        db,
        "users",
        uid,
        "contacts"
      )
    );

    const contacts = snapshot.docs
      .map((document) => {
        const encrypted =
          document.data().encryptedData;

        const contact =
          decryptData(encrypted);

        if (!contact) return null;

        const rawData =
          document.data();

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
            rawData.updatedAt || 0,
          folderIds,
          ...contact,
        };
      })
      .filter(Boolean);

    // Rebuild duplicate cache
    existingEmails.clear();
    existingPhones.clear();

    contacts.forEach((contact: any) => {
      const email = normalizeEmail(
        contact.email
      );

      const phone = normalizePhone(
        contact.phone
      );

      if (email) {
        existingEmails.add(email);
      }

      if (phone) {
        existingPhones.add(phone);
      }
    });

    await AsyncStorage.setItem(
      getStorageKey(),
      JSON.stringify(contacts)
    );

    return contacts;
  } catch (error) {
    console.log(
      "Read Error:",
      error
    );

    const cache =
      await AsyncStorage.getItem(
        getStorageKey()
      );

    return cache
      ? JSON.parse(cache)
      : [];
  }
}

export async function clearContacts() {
  try {
    const uid = auth.currentUser?.uid;

    if (!uid) return;

    const contactsRef = collection(
      db,
      "users",
      uid,
      "contacts"
    );

    const snapshot =
      await getDocs(contactsRef);

    for (const document of snapshot.docs) {
      await deleteDoc(document.ref);
    }

    existingEmails.clear();
    existingPhones.clear();

    await AsyncStorage.removeItem(
      getStorageKey()
    );
  } catch (error) {
    console.log(
      "Clear Error:",
      error
    );
  }
}


/* =====================================================
   FOLDERS
===================================================== */

export type FolderItem = {
  id: string;
  name: string;
  createdAt: number;
};


/**
 * Create a new folder for the
 * currently logged-in user.
 */
export async function createFolder(
  name: string
) {
  try {
    const uid = auth.currentUser?.uid;

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

    /*
     * Check whether a folder with
     * the same name already exists.
     */
    const existingSnapshot =
      await getDocs(foldersRef);

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
          name: trimmedName,
          createdAt,
        }
      );

    console.log(
      "✅ Folder created:",
      folderRef.id
    );

    return {
      id: folderRef.id,
      name: trimmedName,
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


/**
 * Get all folders belonging
 * to the currently logged-in user.
 */
export async function getFolders() {
  try {
    const uid =
      auth.currentUser?.uid;

    if (!uid) return [];

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


/**
 * Set the folders a saved contact
 * belongs to. A contact can be part
 * of multiple folders at the same time.
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
        updatedAt: Date.now(),
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