// import { QQmusicFetch } from "./QQmusicFetch";
import { base64ToUint8Array, sha1, stringToUint8Array, uint8Array8ToBase64 } from "./utils";
const key = base64ToUint8Array("Fw4GJBAoBxNZJ7OW2lI6/LE0unt4QPKFj6F5sxABIAwTGwgF");

const key1 = key.subarray(0, 8);
const midKey = key.subarray(8, 28);
const key2 = key.subarray(28);

const getArrIndex = (hash: Uint8Array, indexArr: Uint8Array) => {
  const str: string[] = [];
  for (let i = 0; i < indexArr.length; i++) {
    const pos = indexArr[i];
    const v = hash[pos >> 1];
    if (v !== undefined) str.push(((pos & 1 ? v : v >> 4) & 0x0f).toString(16));
  }
  return str.join("");
};

export default async function QQmusicSignV3(data: string) {
  const hash = await sha1(stringToUint8Array(data));
  // 两个固定索引字符串
  const str1 = getArrIndex(hash, key1);
  const str2 = getArrIndex(hash, key2);

  // 异或
  for (let i = 0; i < hash.length; i++) hash[i] ^= midKey[i];
  return ("zzc" + str1 + uint8Array8ToBase64(hash).replace(/[+/=]/g, "") + str2).toLowerCase();
}

/** 测试用例 */
// async function getQQmusicData(reqMethods: any) {
//   const isArray = Array.isArray(reqMethods);
//   reqMethods = isArray ? reqMethods : [reqMethods];
//   const reqBody = JSON.stringify(
//     {
//       comm: {
//         cv: 4747474,
//         ct: 24,
//         format: "json",
//         inCharset: "utf-8",
//         outCharset: "utf-8",
//         notice: 0,
//         platform: "yqq.json",
//         needNewCode: 1,
//         uin: 1943718824,
//         g_tk_new_20200303: 1611888019,
//         g_tk: 1611888019,
//       },
//       req_1: {
//         method: "DoSearchForQQMusicDesktop",
//         module: "music.search.SearchCgiService",
//         param: {
//           remoteplace: "txt.yqq.center",
//           searchid: "62664504919516691",
//           search_type: 0,
//           query: "陈奕",
//           page_num: 1,
//           num_per_page: 10,
//         },
//       },
//     },
//     // reqMethods.reduce((obj, curMethod, index) => ((obj["req_" + index] = curMethod), obj), {
//     //   comm: {
//     //     cv: 4747474,
//     //     ct: 24,
//     //     format: "json",
//     //     inCharset: "utf-8",
//     //     outCharset: "utf-8",
//     //     notice: 0,
//     //     platform: "yqq.json",
//     //     needNewCode: 1,
//     //     uin: 1943718824,
//     //     g_tk_new_20200303: 5381,
//     //     g_tk: 5381,
//     //   },
//     // }),
//   );
//   const data = await QQmusicFetch(reqBody, "https://tool.hejianpeng.cn/u.y.qq.com/cgi-bin/musics.fcg");
//   const out = reqMethods.map((_, e) => data["req_" + e]);
//   console.log(data.req_1.data);
//   return isArray ? out : out[0];
// }
// getQQmusicData([
//   {
//     method: "DoSearchForQQMusicDesktop",
//     module: "music.search.SearchCgiService",
//     param: {
//       remoteplace: "txt.yqq.center",
//       searchid: Math.random().toString().substring(2),
//       search_type: 0,
//       query: "陈奕迅",
//       page_num: 1,
//       num_per_page: 10,
//     },
//   },
//   // {
//   //   module: "vkey.GetVkeyServer",
//   //   method: "CgiGetVkey",
//   //   param: {
//   //     guid: "1",
//   //     songmid: ["003aAPj81VWrbL"],
//   //     filename: ["C4000032PB2V2QYWSC.m4a", "M8000032PB2V2QYWSC.mp3"],
//   //     songtype: [0],
//   //     uin: "1",
//   //     loginflag: 1,
//   //     platform: "20",
//   //   },
//   // },
//   // {
//   //   method: "GetPlayLyricInfo",
//   //   module: "music.musichallSong.PlayLyricInfo",
//   //   param: {
//   //     qrc: 1,
//   //     qrc_t: 0,
//   //     roma: 0,
//   //     roma_t: 0,
//   //     //singerName: "5a+M5aOr5bGx5LiL",
//   //     songID: 260678,
//   //     // songName: "6ZmI5aWV6L+F",
//   //     trans: 0,
//   //     trans_t: 0,
//   //     type: 0,
//   //   },
//   // },
// ]).then(d => {
//   console.log(d);
// });
