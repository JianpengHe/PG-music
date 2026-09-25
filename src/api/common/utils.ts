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

export const sha1 = async (data: Uint8Array<any>) => new Uint8Array(await crypto.subtle.digest("SHA-1", data));

export const randomBytes = (len: number) => crypto.getRandomValues(new Uint8Array(len));

export const encrypt = async (algorithm: string, key: Uint8Array<any>, iv: Uint8Array<any>, data: Uint8Array<any>) =>
  await crypto.subtle.encrypt(
    { name: algorithm, iv },
    await crypto.subtle.importKey("raw", key, algorithm, false, ["encrypt"]),
    data,
  );

export const decrypt = async (algorithm: string, key: Uint8Array<any>, iv: Uint8Array<any>, data: Uint8Array<any>) =>
  await crypto.subtle.decrypt(
    { name: algorithm, iv },
    await crypto.subtle.importKey("raw", key, algorithm, false, ["decrypt"]),
    data,
  );

export const zip = (str: string, format: CompressionFormat = "gzip") => {
  const compressed = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(str));
      controller.close();
    },
  }).pipeThrough(new CompressionStream(format));

  return new Response(compressed).arrayBuffer();
};
export const unzip = async (data: BufferSource, format: CompressionFormat = "gzip"): Promise<string> => {
  const decompressed = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      );
      controller.close();
    },
  }).pipeThrough(new DecompressionStream(format));

  return new Response(decompressed).text();
};

export const jsonpFetch = (reqObj: Record<string, any>, host: string, callbackParam = "callback"): Promise<any> => {
  // 创建唯一的JSONP回调函数名
  const callbackName = `penggeJsonp${String(Math.random()).substring(2)}`;
  reqObj[callbackParam] = callbackName;
  const global: any = window;
  return new Promise((resolve, reject) => {
    // 创建JSONP脚本元素
    const jsonpScript = document.createElement("script");
    const url = new URL(host, window.location.href);
    for (const key in reqObj) url.searchParams.append(key, reqObj[key]);
    jsonpScript.src = url.toString();

    // 添加错误处理
    jsonpScript.onerror = () => {
      console.error("QQ音乐API请求失败");
      document.body.removeChild(jsonpScript);
      // 清理全局回调
      delete global[callbackName];
      reject(new Error("JSONP请求失败"));
    };

    // 添加脚本到文档
    document.body.appendChild(jsonpScript);

    // 脚本加载完成后移除
    jsonpScript.onload = () => document.body.removeChild(jsonpScript);
    global[callbackName] = (data: any) => {
      delete global[callbackName];
      resolve(data);
    };
  });
};
export const QQmusicComm = {
  // cv: 4747474,
  // ct: 24,
  format: "json",
  inCharset: "utf-8",
  outCharset: "utf-8",
  notice: 0,
  platform: "yqq.json",
  needNewCode: 1,
  uin: "1",
  // g_tk_new_20200303: 5381,
  // g_tk: 5381,
  ct: "19",
  cv: "2261",
};

export const QQserverUrl = "https://u.y.qq.com/cgi-bin/musics.fcg";
export const QQserverUrlSmartbox = "https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg";

export const needLoginMethods = ["DoSearchForQQMusicDesktop", "CgiGetVkey"];

export const isServer = typeof window === "undefined";
