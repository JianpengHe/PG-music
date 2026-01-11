"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const key = Array.from(atob("FQQJGhAUGx7ULVBEw6Ojy53c/lvMT2gGEgsDAgEHBhk="), a => a.charCodeAt(0));
const order = Array(62)
    .fill(0)
    .map((_, i) => (i < 52 ? ((i % 26) + 10).toString(36) : String(i - 52)))
    .join("");
const MD5 = globalThis["$MD5"] ||
    (() => {
        const crypto = __non_webpack_require__("crypto");
        return (str) => crypto.createHash("md5").update(str).digest("hex");
    })();
const getArrIndex = (str, indexArr) => indexArr.map(index => str[index] || "").join("");
const midKey = (hash) => {
    const key2 = key
        .slice(8, 24)
        .map((ch, index) => (parseInt(hash[index * 2], 16) * 16) ^ parseInt(hash[index * 2 + 1], 16) ^ ch);
    const key3 = [];
    let i = 0;
    while (i < ((key2.length / 3) | 0)) {
        key3.push(key2[i * 3] >> 2);
        key3.push(((key2[i * 3] & 3) << 4) | (key2[i * 3 + 1] >> 4));
        key3.push(((key2[i * 3 + 1] & 15) << 2) | (key2[i * 3 + 2] >> 6));
        key3.push(key2[i * 3 + 2] & 63);
        i++;
    }
    key3.push(key2[i * 3] >> 2);
    key3.push((key2[i * 3] & 3) << 4);
    return getArrIndex(order, key3);
};
exports.default = (str) => {
    const hash = MD5(str).toLowerCase();
    return "zzb" + getArrIndex(hash, key.slice(0, 8)) + midKey(hash) + getArrIndex(hash, key.slice(24));
};
//# sourceMappingURL=QQmusicSign.js.map