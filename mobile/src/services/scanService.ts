import * as FileSystem from "expo-file-system/legacy";
import { auth } from "./firebase";

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.132:8000"
).replace(/\/+$/, "") + "/upload";

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
    const filename = uri.split("/").pop() || `card_${i + 1}.jpg`;
    const type = "image/jpeg";

    formData.append("files", {
      uri,
      name: filename,
      type,
    } as any);
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Upload failed");
  }

  const data = await response.json();

  return {
    cards: data.cards || [],
  };
}
