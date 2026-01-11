const key = Array.from(atob("FQQJGhAUGx7ULVBEw6Ojy53c/lvMT2gGEgsDAgEHBhk="), a => a.charCodeAt(0));
/** abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz0123456789 */
const order = Array(62)
  .fill(0)
  .map((_, i) => (i < 52 ? ((i % 26) + 10).toString(36) : String(i - 52)))
  .join("");

if (!globalThis["window"]) {
  //@ts-ignore
  const crypto = __non_webpack_require__("crypto");
  globalThis["$MD5"] = (str: string) => crypto.createHash("md5").update(str).digest("hex");
}

const getArrIndex = (str: string | number[], indexArr: number[]) => indexArr.map(index => str[index] || "").join("");
const midKey = (hash: string) => {
  const key2 = key
    .slice(8, 24)
    .map((ch, index) => (parseInt(hash[index * 2], 16) * 16) ^ parseInt(hash[index * 2 + 1], 16) ^ ch);
  const key3: number[] = [];
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

export default (str: string) => {
  const hash = globalThis["$MD5"](str).toLowerCase();
  return "zzb" + getArrIndex(hash, key.slice(0, 8)) + midKey(hash) + getArrIndex(hash, key.slice(24));
};

// export const QQmusicSign1 = (function (c1, a) {
//   var b = function (g: string) {
//     var d = key.slice(8, 24).map(function (h, j) {
//       return (parseInt(g[j * 2], 16) * 16) ^ parseInt(g[j * 2 + 1], 16) ^ h;
//     });
//     var f = [];
//     for (var e = 0; e < ((d.length / 3) | 0); e++) {
//       f.push(d[e * 3] >> 2);
//       f.push(((d[e * 3] & 3) << 4) | (d[e * 3 + 1] >> 4));
//       f.push(((d[e * 3 + 1] & 15) << 2) | (d[e * 3 + 2] >> 6));
//       f.push(d[e * 3 + 2] & 63);
//     }
//     f.push(d[e * 3] >> 2);
//     f.push((d[e * 3] & 3) << 4);
//     return f.map(function (h) {
//       return a[h] || "";
//     });
//   };
//   return function (e: string) {
//     e = MD5(e).toLowerCase();
//     var d = function (f) {
//       return e[f];
//     };
//     return ["z", "z", "b"].concat(key.slice(0, 8).map(d), b(e), key.slice(24).map(d)).join("");
//   };
// })("FQQJGhAUGx7ULVBEw6Ojy53c/lvMT2gGEgsDAgEHBhk=", "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz0123456789");

/** 测试用例 */
// function getQQmusicData(h, i) {
//   var d = Array.isArray(h);
//   h = d ? h : [h];
//   var j = JSON.stringify(
//     h.reduce(
//       function (a, b, c) {
//         a["req_" + c] = b;
//         return a;
//       },
//       {
//         comm: {
//           format: "json",
//           inCharset: "utf-8",
//           outCharset: "utf-8",
//           notice: 0,
//           platform: "yqq.json",
//           needNewCode: 1,
//           uin: "1",
//         },
//       },
//     ),
//   );
//   require("https")
//     .request(
//       "https://u.y.qq.com/cgi-bin/musics.fcg?_=" + new Date().getTime() + "&sign=" + QQmusicSign(j),
//       {
//         method: "POST",
//         headers: {
//           Accept: "*/*",
//           "Accept-Language": "zh-CN",
//           "User-Agent": "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)",
//           Cookie: "",
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       },
//       function (b) {
//         var a: any = [];
//         b.on("data", function (c) {
//           a.push(c);
//         });
//         b.on("end", function () {
//           var c = JSON.parse(String(Buffer.concat(a)));
//           c = h.map(function (f, e) {
//             return c["req_" + e];
//           });
//           i(d ? c : c[0]);
//         });
//       },
//     )
//     .end(j);
// }

// getQQmusicData(
//   [
//     {
//       module: "vkey.GetVkeyServer",
//       method: "CgiGetVkey",
//       param: {
//         guid: "1",
//         songmid: ["003aAPj81VWrbL"],
//         filename: ["C4000032PB2V2QYWSC.m4a", "M8000032PB2V2QYWSC.mp3"],
//         songtype: [0],
//         uin: "1",
//         loginflag: 1,
//         platform: "20",
//       },
//     },
//     {
//       method: "GetPlayLyricInfo",
//       module: "music.musichallSong.PlayLyricInfo",
//       param: {
//         qrc: 1,
//         qrc_t: 0,
//         roma: 0,
//         roma_t: 0,
//         //singerName: "5a+M5aOr5bGx5LiL",
//         songID: 260678,
//         // songName: "6ZmI5aWV6L+F",
//         trans: 0,
//         trans_t: 0,
//         type: 0,
//       },
//     },
//   ],
//   function (d) {
//     console.log(d);
//   },
// );
