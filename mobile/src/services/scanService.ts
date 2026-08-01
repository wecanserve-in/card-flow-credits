import * as FileSystem from "expo-file-system/legacy";

const API_URL = "https://card-flow-credits.onrender.com/upload";

export async function uploadCards(images: string[]) {
  if (images.length === 0) {
    throw new Error("No images selected");
  }

  const allCards: any[] = [];

  for (const imageUri of images) {
    console.log("Uploading:", imageUri);

    const response = await FileSystem.uploadAsync(
      API_URL,
      imageUri,
      {
        fieldName: "files",
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        mimeType: "image/jpeg",
      }
    );

    console.log("Status:", response.status);
    console.log("Body:", response.body);

    if (response.status !== 200) {
      throw new Error(response.body || "Upload failed");
    }

    const data = JSON.parse(response.body);

    if (data.cards) {
      allCards.push(...data.cards);
    }
  }

  return {
    cards: allCards,
  };
}