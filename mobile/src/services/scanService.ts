import { File } from "expo-file-system";
import { auth } from "./firebase";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://scanmycard-126413727192.asia-south1.run.app";

const API_URL = `${BASE_URL.replace(/\/+$/, "")}/upload`;

// The server accepts at most 25 cards per request.
const BATCH_SIZE = 20;

export type CreditBalance = {
  total: number;
  used: number;
  remaining: number;
};

export type UploadResult = {
  // Every card the server returned; unreadable ones have `unreadable: true`.
  cards: any[];
  credits: CreditBalance | null;
  // Set when some batches succeeded and a later one failed.
  partialError: ScanError | null;
  // Photos from batches that failed (not charged), to keep in the queue.
  failedImages: string[];
};

export class ScanError extends Error {
  status: number;
  code: string;
  ref: string;

  constructor(message: string, status: number, code = "", ref = "") {
    super(message);
    this.name = "ScanError";
    this.status = status;
    this.code = code;
    this.ref = ref;
  }
}

/**
 * Title and message to show the user for a failed scan. The server sends a
 * `code` and a friendly `message`; phone-side problems get their own text.
 */
export function describeScanError(error: unknown): { title: string; message: string } {
  if (!(error instanceof ScanError)) {
    return {
      title: "Extraction Failed",
      message: "Something went wrong. Your cards are still here, so please try again.",
    };
  }

  switch (error.code) {
    case "NETWORK":
      return {
        title: "No Internet Connection",
        message: "Your cards are still here and no scans were used. Check your connection and tap Extract again.",
      };
    case "AI_BUSY":
      return {
        title: "AI Is Busy",
        message: "Our AI is busy right now. No scans were used. Please try again in a minute.",
      };
    case "INSUFFICIENT_CREDITS":
      return { title: "Not Enough Scans", message: error.message };
    case "IMAGE_EMPTY":
    case "IMAGE_TOO_LARGE":
      return { title: "Photo Problem", message: `${error.message} No scans were used.` };
    case "SERVER_ERROR":
      return { title: "Something Went Wrong", message: error.message };
    default:
      return {
        title: "Extraction Failed",
        message: `${error.message || "Please try again."} Your cards are still here.`,
      };
  }
}

export function isInsufficientCredits(error: unknown) {
  return (
    error instanceof ScanError &&
    error.code === "INSUFFICIENT_CREDITS"
  );
}

async function uploadBatch(images: string[]) {
  const user = auth.currentUser;

  if (!user) {
    throw new ScanError("Please sign in before uploading.", 401);
  }

  const token = await user.getIdToken();

  const formData = new FormData();

  for (const uri of images) {
    formData.append("files", new File(uri) as any);
  }

  let response: Response;

  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch {
    // fetch only throws when the request never got a reply.
    throw new ScanError("No internet connection.", 0, "NETWORK");
  }

  if (!response.ok) {
    let message = "Upload failed";
    let code = "";
    let ref = "";

    try {
      const body = await response.json();
      const detail = body?.detail;

      if (typeof detail === "string") {
        message = detail;
      } else if (detail && typeof detail === "object") {
        message = detail.message || message;
        code = detail.code || "";
        ref = detail.ref || "";
      }
    } catch {
      // Non-JSON error body; keep the generic message.
    }

    console.error("[API] Upload failed with status", response.status);

    throw new ScanError(message, response.status, code, ref);
  }

  const data = await response.json();
  const cards: any[] = Array.isArray(data.cards) ? data.cards : [];

  // The server returns cards in the order the photos were sent (card_no 1..n).
  for (const card of cards) {
    card.sourceUri = images[(Number(card.card_no) || 1) - 1];
  }

  return {
    cards,
    credits: (data.credits as CreditBalance) || null,
  };
}

/**
 * Sends the images to the server in batches. The server checks and deducts
 * credits itself (unreadable cards are refunded). If a later batch fails, the
 * cards from earlier batches are still returned, with the error in
 * `partialError` and the failed photos in `failedImages`.
 */
export async function uploadCards(images: string[]): Promise<UploadResult> {
  if (images.length === 0) {
    throw new Error("No images selected");
  }

  const cards: any[] = [];
  let credits: CreditBalance | null = null;

  for (let start = 0; start < images.length; start += BATCH_SIZE) {
    try {
      const batch = await uploadBatch(images.slice(start, start + BATCH_SIZE));

      // Renumber so card_no stays unique across batches.
      for (const card of batch.cards) {
        cards.push({ ...card, card_no: cards.length + 1 });
      }

      credits = batch.credits ?? credits;
    } catch (error) {
      if (cards.length === 0) {
        throw error;
      }

      const partialError =
        error instanceof ScanError
          ? error
          : new ScanError("Some cards could not be scanned.", 0);

      return { cards, credits, partialError, failedImages: images.slice(start) };
    }
  }

  return { cards, credits, partialError: null, failedImages: [] };
}
