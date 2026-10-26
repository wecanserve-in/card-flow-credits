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
  cards: any[];
  credits: CreditBalance | null;
  // Set when some batches succeeded and a later one failed.
  partialError: ScanError | null;
};

export class ScanError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = "") {
    super(message);
    this.name = "ScanError";
    this.status = status;
    this.code = code;
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

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = "Upload failed";
    let code = "";

    try {
      const body = await response.json();
      const detail = body?.detail;

      if (typeof detail === "string") {
        message = detail;
      } else if (detail && typeof detail === "object") {
        message = detail.message || message;
        code = detail.code || "";
      }
    } catch {
      // Non-JSON error body; keep the generic message.
    }

    console.error("[API] Upload failed with status", response.status);

    throw new ScanError(message, response.status, code);
  }

  const data = await response.json();

  return {
    cards: Array.isArray(data.cards) ? data.cards : [],
    credits: (data.credits as CreditBalance) || null,
  };
}

/**
 * Sends the images to the server in batches. The server checks and deducts
 * credits itself. If a later batch fails, the cards from earlier batches are
 * still returned (and were charged), with the error in `partialError`.
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

      return { cards, credits, partialError };
    }
  }

  return { cards, credits, partialError: null };
}
