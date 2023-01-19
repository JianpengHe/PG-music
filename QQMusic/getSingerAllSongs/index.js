const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const mysql_con = require("../comm/mysql_con");
const BACKUP_PATH = "D:/songs/data";
const PATH = "D:/songs/album";

const singer = {
  "002pUZT93gF4Cu": "BEYOND",
  "003BDAae0JQAHV": "侧田",
  "001HXWxi185oiP": "关正杰",
  "002TQIvU0HOCU3": "关淑怡",
  "003aQYLo2x8izP": "刘德华",
  "000NFT2p1GbnPB": "古巨基",
  "00128nnX2r4UFX": "叶蒨文",
  "00081ZN91FD8QW": "吕方",
  "001E7ELU1UeaEH": "吴若希",
  "003NThQh3ujqIo": "周华健",
  "0000ETfl2XvUfM": "周慧敏",
  "00180Rk61RE4qh": "周柏豪",
  "001uXFgt1kpLyI": "容祖儿",
  "000zgYId2EvVRY": "左麟右李",
  "0001v4XU1cZxPy": "张国荣",
  "004Be55m1SJaLk": "张学友",
  "003AfDK34H82GU": "张敬轩",
  "004HStLx460K4g": "张智霖",
  "0021s7e94Aqglw": "徐小凤",
  "003nS2v740Lxcw": "李克勤",
  "002tafxY1wVzqX": "杜德伟",
  "000xogLP35ayzS": "杨千嬅",
  "003xM8SD2WibJI": "林子祥",
  "0028iJ7f3Tjl97": "林峯",
  "002u0TJy47WWOj": "林忆莲",
  "003RfioZ1j7KJR": "梁咏琪",
  "001srHmw2Mhtlq": "梁汉文",
  "0011CYh41MbdFm": "梅艳芳",
  "000Y4rLC41QcV1": "汪明荃",
  "004LfgzR3pxV4q": "洪卓立",
  "001bZjWR3bBuOL": "温兆伦",
  "001vyXmi2Je9LV": "温拿乐队",
  "003NKwHr46UKeR": "王杰",
  "003V1SaZ2sQMLZ": "王祖蓝",
  "000GDDuQ3sGQiT": "王菲",
  "000H1y5p2jQKaU": "甄妮",
  "0011E6iP3x2vRn": "罗文",
  "003pVJZJ2uEq4j": "草蜢",
  "001OOgSA1QyuDV": "蔡国权",
  "0005FEv73Z2scR": "许冠杰",
  "00367xza48QUVv": "许廷铿",
  "000Jh2K72nwQmN": "许志安",
  "001YZBa22LLKce": "谢安琪",
  "004GPm8B362txY": "谢霆锋",
  "0040D7gK4aI54k": "谭咏麟",
  "001lEIeU2bmx9y": "邝美云",
  "001GniJ52Wcp8W": "邰正宵",
  "001XOTno2nFjJP": "郑中基",
  "003bdcMg1ML7YC": "郑伊健",
  "002yjHfE3aJX69": "郑秀文",
  "003yM0OT1EPY0y": "郭富城",
  "001ZEnNS19gR0h": "钟镇涛",
  "003Nz2So3XXYek": "陈奕迅",
  "004DFS271osAwp": "陈小春",
  "000JvETZ3tOrPR": "陈慧娴",
  "000ynT3J1Hrdp1": "陈慧琳",
  "003Z6Uiu1dvLv0": "陈柏宇",
  "0033DUFG3yj0r3": "陈百强",
  "0041l9xT317k8V": "黄凯芹",
  "001wYy5s2mM3Tq": "黎明",
};
const newWorker = (path, workerData) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(__dirname + "/" + path, { workerData });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", code => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
      resolve();
    });
  });

(async () => {
  console.log("第一步");
  console.log(
    await Promise.all([
      //newWorker("getMainInfo.js", { singer }),
      newWorker("readFileSizeToDB.js", { BACKUP_PATH, PATH }),
    ])
  );

  setTimeout(() => {
    process.exit();
  }, 1000);
})();
