export const base64ToUint8Array: (base64: string) => Uint8Array =
  (Uint8Array as any).fromBase64 ??
  (typeof Buffer !== "undefined"
    ? base64 => new Uint8Array(Buffer.from(base64, "base64"))
    : base64 => {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
      });

export const uint8Array8ToBase64: (u8: Uint8Array) => string =
  (Uint8Array as any).toBase64 ??
  (typeof Buffer !== "undefined"
    ? u8 => Buffer.from(u8).toString("base64")
    : u8 => {
        const chunks: string[] = [];
        for (let i = 0; i < u8.length; i++) chunks.push(String.fromCharCode(u8[i]));
        return btoa(chunks.join(""));
      });

export const stringToUint8Array = (str: string) => new TextEncoder().encode(str);
export const uint8ArrayToString = (u8: Uint8Array | ArrayBuffer) => new TextDecoder().decode(u8);

export const sha1 = async (data: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-1", data));

export const randomBytes = (len: number) => crypto.getRandomValues(new Uint8Array(len));

export const encrypt = async (algorithm: string, key: Uint8Array, iv: Uint8Array, data: Uint8Array) =>
  await crypto.subtle.encrypt(
    { name: algorithm, iv },
    await crypto.subtle.importKey("raw", key, algorithm, false, ["encrypt"]),
    data,
  );

export const decrypt = async (algorithm: string, key: Uint8Array, iv: Uint8Array, data: Uint8Array) =>
  await crypto.subtle.decrypt(
    { name: algorithm, iv },
    await crypto.subtle.importKey("raw", key, algorithm, false, ["decrypt"]),
    data,
  );
