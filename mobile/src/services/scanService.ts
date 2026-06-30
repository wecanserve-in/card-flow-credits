import * as FileSystem from "expo-file-system/legacy";

const API_URL = "http://192.168.1.36:8000/upload";

export async function uploadCards(images: string[]) {
  if (images.length === 0) {
    throw new Error("No images selected");
  }

  // For now upload one image at a time
  // We'll optimize for multiple uploads later

  const response = await FileSystem.uploadAsync(
    API_URL,
    images[0],
    {
      fieldName: "files",
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      mimeType: "image/jpeg",
      parameters: {},
    }
  );

  if (response.status !== 200) {
    console.log(response.body);
    throw new Error("Upload failed");
  }

  return JSON.parse(response.body);
}