import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "./firebase";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
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
    return "SCAN2SHEET_GUEST";
  }

  return `SCAN2SHEET_CONTACTS_${uid}`;
};

export async function saveContacts(newContacts: any[]) {
  try {
    const uid = auth.currentUser?.uid;

    if (!uid) return false;
    
console.log("========== SAVE START ==========");
console.log("UID:", uid);
console.log("Contacts:", newContacts);
    

    const STORAGE_KEY = getStorageKey();

    const existing = await AsyncStorage.getItem(STORAGE_KEY);

    const existingContacts = existing
      ? JSON.parse(existing)
      : [];

    const contactsToSave = [];

    for (const contact of newContacts) {
      const email = normalizeEmail(contact.email);
      const phone = normalizePhone(contact.phone);

      const duplicate =
        (email && existingEmails.has(email)) ||
        (phone && existingPhones.has(phone));

      if (duplicate) {
        console.log("Duplicate Contact Skipped");
        continue;
      }

      const encrypted = encryptData(contact);

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

      console.log("✅ Saved Contact:", documentId);

      if (email) existingEmails.add(email);
      if (phone) existingPhones.add(phone);

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
  }catch (error: any) {
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
  collection(db, "users", uid, "contacts")
);

    const contacts = snapshot.docs
      .map((document) => {
        const encrypted = document.data().encryptedData;

        const contact = decryptData(encrypted);

        if (!contact) return null;

  return {
  id: document.id,
  updatedAt: document.data().updatedAt || 0,
  ...contact,
};
      })
      .filter(Boolean);

    // Rebuild duplicate cache
    existingEmails.clear();
    existingPhones.clear();

    contacts.forEach((contact: any) => {
      const email = normalizeEmail(contact.email);
      const phone = normalizePhone(contact.phone);

      if (email) existingEmails.add(email);
      if (phone) existingPhones.add(phone);
    });

    await AsyncStorage.setItem(
      getStorageKey(),
      JSON.stringify(contacts)
    );

    return contacts;

  } catch (error) {
    console.log("Read Error:", error);

    const cache = await AsyncStorage.getItem(getStorageKey());

    return cache ? JSON.parse(cache) : [];
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

    const snapshot = await getDocs(contactsRef);

    for (const document of snapshot.docs) {
      await deleteDoc(document.ref);
    }

    existingEmails.clear();
    existingPhones.clear();

    await AsyncStorage.removeItem(getStorageKey());

  } catch (error) {
    console.log("Clear Error:", error);
  }
}