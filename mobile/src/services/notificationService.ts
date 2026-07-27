import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "./firebase";

export type NotificationType =
  | "extraction_success"
  | "extraction_failed"
  | "credits_low"
  | "credits_empty"
  | "payment_success"
  | "payment_failed"
  | "payment_cancelled"
  | "export_success"
  | "export_failed"
  | "subscription_expiring"
  | "subscription_expired"
  | "general";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionRoute?: string | null;
  eventKey?: string | null;
  createdAt?: any;
};

type CreateNotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  actionRoute?: string;
  eventKey?: string;
};

function getNotificationsCollection() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  return collection(
    db,
    "users",
    user.uid,
    "notifications"
  );
}

export async function createNotification({
  type,
  title,
  message,
  actionRoute,
  eventKey,
}: CreateNotificationInput) {
  const user = auth.currentUser;

  if (!user) {
    console.log(
      "Notification skipped because no user is authenticated."
    );
    return null;
  }

  try {
    const notificationsRef =
      getNotificationsCollection();

    /*
     * Prevent duplicate notifications when an eventKey
     * is supplied.
     */
    if (eventKey) {
      const duplicateQuery = query(
        notificationsRef,
        where("eventKey", "==", eventKey),
        limit(1)
      );

      const duplicateSnapshot =
        await getDocs(duplicateQuery);

      if (!duplicateSnapshot.empty) {
        return duplicateSnapshot.docs[0].id;
      }
    }

    const result = await addDoc(
      notificationsRef,
      {
        type,
        title,
        message,
        read: false,
        actionRoute: actionRoute || null,
        eventKey: eventKey || null,
        createdAt: serverTimestamp(),
      }
    );

    return result.id;
  } catch (error) {
    console.error(
      "Create notification error:",
      error
    );

    return null;
  }
}

export function subscribeToNotifications(
  callback: (
    notifications: AppNotification[]
  ) => void,
  onError?: (error: Error) => void
) {
  const user = auth.currentUser;

  if (!user) {
    callback([]);
    return () => {};
  }

  const notificationsQuery = query(
    collection(
      db,
      "users",
      user.uid,
      "notifications"
    ),
    orderBy("createdAt", "desc"),
    limit(100)
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const notifications =
        snapshot.docs.map((notificationDoc) => ({
          id: notificationDoc.id,
          ...(notificationDoc.data() as Omit<
            AppNotification,
            "id"
          >),
        }));

      callback(notifications);
    },
    (error) => {
      console.error(
        "Notification listener error:",
        error
      );

      onError?.(error);
    }
  );
}

export async function markNotificationAsRead(
  notificationId: string
) {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  await updateDoc(
    doc(
      db,
      "users",
      user.uid,
      "notifications",
      notificationId
    ),
    {
      read: true,
    }
  );
}

export async function markAllNotificationsAsRead() {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  const notificationsSnapshot =
    await getDocs(
      collection(
        db,
        "users",
        user.uid,
        "notifications"
      )
    );

  if (notificationsSnapshot.empty) {
    return;
  }

  const batch = writeBatch(db);

  notificationsSnapshot.docs.forEach(
    (notificationDoc) => {
      if (
        notificationDoc.data().read !== true
      ) {
        batch.update(
          notificationDoc.ref,
          {
            read: true,
          }
        );
      }
    }
  );

  await batch.commit();
}

export async function deleteNotification(
  notificationId: string
) {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  await deleteDoc(
    doc(
      db,
      "users",
      user.uid,
      "notifications",
      notificationId
    )
  );
}

export async function clearAllNotifications() {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  const notificationsSnapshot =
    await getDocs(
      collection(
        db,
        "users",
        user.uid,
        "notifications"
      )
    );

  if (notificationsSnapshot.empty) {
    return;
  }

  const batch = writeBatch(db);

  notificationsSnapshot.docs.forEach(
    (notificationDoc) => {
      batch.delete(notificationDoc.ref);
    }
  );

  await batch.commit();
}

export async function createCreditNotification({
  remaining,
  used,
  total,
}: {
  remaining: number;
  used: number;
  total: number;
}) {
  if (remaining === 5) {
    await createNotification({
      type: "credits_low",
      title: "Credits running low",
      message:
        "You have only 5 card scans remaining.",
      actionRoute: "/plans",
      eventKey: `credits-5-${used}-${total}`,
    });

    return;
  }

  if (remaining === 3) {
    await createNotification({
      type: "credits_low",
      title: "Credits running low",
      message:
        "You have only 3 card scans remaining.",
      actionRoute: "/plans",
      eventKey: `credits-3-${used}-${total}`,
    });

    return;
  }

  if (remaining === 1) {
    await createNotification({
      type: "credits_low",
      title: "Last credit remaining",
      message:
        "You have only 1 card scan left.",
      actionRoute: "/plans",
      eventKey: `credits-1-${used}-${total}`,
    });

    return;
  }

  if (remaining <= 0) {
    await createNotification({
      type: "credits_empty",
      title: "No credits remaining",
      message:
        "You have used all available card scans. Upgrade your plan to continue.",
      actionRoute: "/plans",
      eventKey: `credits-0-${used}-${total}`,
    });
  }
}