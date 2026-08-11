import { File } from "expo-file-system";
import { auth } from "./firebase";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not configured");
}

const API_URL = `${BASE_URL.replace(/\/+$/, "")}/upload`;

export async function uploadCards(images: string[]) {
  if (images.length === 0) {
    throw new Error("No images selected");
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in before uploading.");
  }

  const token = await user.getIdToken();

  const formData = new FormData();

  for (let i = 0; i < images.length; i++) {
    const uri = images[i];

    const filename =
      uri.split("/").pop() || `card_${i + 1}.jpg`;

    const file = new File(uri);

    formData.append("files", file);
  }

  console.log("[API] Upload URL:", API_URL);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.error("[API] Upload failed:", {
      status: response.status,
      error: errorText,
    });

    throw new Error(errorText || "Upload failed");
  }

  const data = await response.json();

  console.log("[API] Upload successful:", data);

  return {
    cards: data.cards || [],
  };
}