import { File } from "expo-file-system";
import { auth } from "./firebase";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://scanmycard-126413727192.asia-south1.run.app";

const API_URL = `${BASE_URL.replace(/\/+$/, "")}/upload/profile-photo`;

export async function uploadProfilePhoto(imageUri: string): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in to upload a photo.");
  }

  const token = await user.getIdToken();

  const file = new File(imageUri);

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Photo upload failed");
  }

  const data = await response.json();
  return data.url;
}
