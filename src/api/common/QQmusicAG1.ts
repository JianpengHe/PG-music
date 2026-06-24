import { base64ToUint8Array, decrypt, encrypt, randomBytes, stringToUint8Array, uint8ArrayToString } from "./utils";
const key = base64ToUint8Array("vTBfEND/dLbvVNq4NbXhz3o/jB1emy8KbE1+ix86XJ0OK29KgQ==");
const requestKey = key.subarray(0, 16);
const responseKey = key.subarray(16);

export async function encodeAG1Request(data: string): Promise<Uint8Array> {
  const iv = randomBytes(12);
  const encrypted = await encrypt("AES-GCM", requestKey, iv, stringToUint8Array(data));

  const finalData = new Uint8Array(iv.length + encrypted.byteLength);
  finalData.set(iv);
  finalData.set(new Uint8Array(encrypted), iv.length);
  return finalData;
}

export async function decodeAG1Request(data: Uint8Array): Promise<string> {
  const iv = data.subarray(0, 12);
  const encryptedData = data.subarray(12);

  const decrypted = await decrypt("AES-GCM", requestKey, iv, encryptedData);
  return uint8ArrayToString(decrypted);
}

export function decodeAG1Response(response: Uint8Array): string {
  for (let i = 0; i < response.length; i++) response[i] ^= responseKey[i % responseKey.length];
  return new TextDecoder().decode(response);
}

export function encodeAG1Response(data: string): Uint8Array {
  const response = new Uint8Array(new TextEncoder().encode(data));
  for (let i = 0; i < response.length; i++) response[i] ^= responseKey[i % responseKey.length];
  return response;
}
