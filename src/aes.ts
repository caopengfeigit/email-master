// utils/encryption.ts
import CryptoJS from "crypto-js";
import hostConfig from "@/host-config"; // Adjust the import as per your project structure

// Encryption key and IV (use your configuration)
const key = CryptoJS.enc.Utf8.parse(hostConfig.getAES_rate());
const iv = CryptoJS.enc.Utf8.parse(hostConfig.getAES_rate());

// Base64 Web Safe encoding
function base64ToWebSafe(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_");
}

// AES encryption function
export function encrypt(text: string): string {
  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const base64 = encrypted.toString();
  return base64ToWebSafe(base64);
}
