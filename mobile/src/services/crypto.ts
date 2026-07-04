import CryptoJS from "crypto-js";

const SECRET =
  process.env.EXPO_PUBLIC_APP_ENCRYPTION_KEY || "";

// 32-byte AES key
const KEY = CryptoJS.SHA256(SECRET);

// Fixed IV (16 bytes)
const IV = CryptoJS.enc.Utf8.parse(
  SECRET.padEnd(16, "0").slice(0, 16)
);

export function encryptData(data: any): string {
  return CryptoJS.AES.encrypt(
    JSON.stringify(data),
    KEY,
    {
      iv: IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  ).toString();
}

export function decryptData(encrypted: string): any | null {
  try {
    const bytes = CryptoJS.AES.decrypt(
      encrypted,
      KEY,
      {
        iv: IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    const text = bytes.toString(CryptoJS.enc.Utf8);

    if (!text) return null;

    return JSON.parse(text);
  } catch (e) {
    console.log("Decrypt Error:", e);
    return null;
  }
}