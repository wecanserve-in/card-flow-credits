import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "./firebase";

import { encryptData, decryptData } from "./crypto";

export type AppEvent = {
  id: string;
  name: string;
  location?: string;
  date?: string | null;
  contactCount?: number;
  createdAt?: any;
  updatedAt?: number;
};

let existingEventEmails = new Set<string>();
let existingEventPhones = new Set<string>();

const normalizeEmail = (email?: string) =>
  email?.trim().toLowerCase() || "";

const normalizePhone = (phone?: string) =>
  (phone || "").replace(/\D/g, "").slice(-10);

function getEventsCollection() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  return collection(db, "users", user.uid, "events");
}

function getEventContactsCollection(eventId: string) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  return collection(
    db,
    "users",
    user.uid,
    "events",
    eventId,
    "contacts"
  );
}

export async function createEvent({
  name,
  location,
  date,
}: {
  name: string;
  location?: string;
  date?: string | null;
}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  const eventRef = doc(getEventsCollection());

  await setDoc(eventRef, {
    name: name.trim(),
    location: location?.trim() || "",
    date: date ?? null,
    contactCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: Date.now(),
  });

  return eventRef.id;
}

export async function getEvents(): Promise<AppEvent[]> {
  const user = auth.currentUser;

  if (!user) {
    return [];
  }

  const snapshot = await getDocs(
    query(
      getEventsCollection(),
      orderBy("createdAt", "desc")
    )
  );

  const events = snapshot.docs.map((eventDoc) => ({
    id: eventDoc.id,
    ...(eventDoc.data() as Omit<AppEvent, "id">),
  }));

  await AsyncStorage.setItem(
    `ScanMyCard_EVENTS_${user.uid}`,
    JSON.stringify(events)
  );

  return events;
}

export async function getEvent(eventId: string): Promise<AppEvent | null> {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  const snapshot = await getDoc(
    doc(
      db,
      "users",
      user.uid,
      "events",
      eventId
    )
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<AppEvent, "id">),
  };
}

export async function deleteEvent(eventId: string) {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  const contactsSnapshot = await getDocs(
    getEventContactsCollection(eventId)
  );

  for (const contactDoc of contactsSnapshot.docs) {
    await deleteDoc(contactDoc.ref);
  }

  await deleteDoc(
    doc(db, "users", user.uid, "events", eventId)
  );
}

export async function saveEventContacts(
  eventId: string,
  newContacts: any[]
) {
  const user = auth.currentUser;

  if (!user) {
    return false;
  }

  const eventRef = doc(
    db,
    "users",
    user.uid,
    "events",
    eventId
  );

  const eventSnapshot = await getDoc(eventRef);

  if (!eventSnapshot.exists()) {
    throw new Error("Event folder does not exist.");
  }

  const contactsCollection = getEventContactsCollection(eventId);

  const existingSnapshot = await getDocs(contactsCollection);

  existingEventEmails.clear();
  existingEventPhones.clear();

  const existingIds = new Set<string>();

  for (const contactDoc of existingSnapshot.docs) {
    existingIds.add(contactDoc.id);

    const contact = decryptData(contactDoc.data().encryptedData);

    if (!contact) {
      continue;
    }

    const email = normalizeEmail(contact.email);
    const phone = normalizePhone(contact.phone);

    if (email) existingEventEmails.add(email);
    if (phone) existingEventPhones.add(phone);
  }

  const contactsToSave = [];

  for (const contact of newContacts) {
    const email = normalizeEmail(contact.email);
    const phone = normalizePhone(contact.phone);

    const duplicate =
      (email && existingEventEmails.has(email)) ||
      (phone && existingEventPhones.has(phone));

    if (duplicate) {
      console.log("Duplicate Event Contact Skipped");
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
      doc(contactsCollection, documentId),
      {
        encryptedData: encrypted,
        updatedAt: Date.now(),
      }
    );

    if (email) existingEventEmails.add(email);
    if (phone) existingEventPhones.add(phone);

    contactsToSave.push(contact);
  }

  if (contactsToSave.length > 0) {
    await updateDoc(eventRef, {
      contactCount: existingIds.size + contactsToSave.length,
      updatedAt: Date.now(),
    });
  }

  return true;
}

export async function getEventContacts(eventId: string): Promise<any[]> {
  const user = auth.currentUser;

  if (!user) {
    return [];
  }

  const snapshot = await getDocs(
    query(
      getEventContactsCollection(eventId),
      orderBy("updatedAt", "desc")
    )
  );

  return snapshot.docs
    .map((document) => {
      const contact = decryptData(document.data().encryptedData);

      if (!contact) {
        return null;
      }

      return {
        id: document.id,
        updatedAt: document.data().updatedAt || 0,
        ...contact,
      };
    })
    .filter(Boolean);
}