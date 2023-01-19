const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const mysql_con = require("../comm/mysql_con");
const BACKUP_PATH = "D:/songs/backup";
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
  const [_, { backupFileMap, fileMap }] = await Promise.all([
    newWorker("getMainInfo.js", { singer }),
    newWorker("readFileSizeToDB.js", { BACKUP_PATH, PATH }),
  ]);
  console.log("已下载文件数", fileMap.size, "backup文件数", backupFileMap.size);

  await mysql_con.mysql.query("UPDATE `media` SET `is_vip`=null,`down_mid`=null;", []);
  await mysql_con.mysql.query(
    "UPDATE (SELECT media_mid,min(is_vip) as need_vip FROM song WHERE disabled=0 GROUP BY media_mid)b INNER join media on media.media_mid=b.media_mid set media.is_vip=b.need_vip WHERE media.media_mid in (SELECT media_mid FROM song WHERE album_id in (SELECT albumID FROM album)) and (	size_96aac>0 or size_320mp3>0 or size_flac>0);",
    []
  );
  await mysql_con.mysql.query(
    "UPDATE (SELECT song.media_mid,mid FROM media INNER JOIN song on media.media_mid=song.media_mid WHERE media.is_vip=song.is_vip and song.disabled=0) a INNER JOIN media on a.media_mid=media.media_mid set media.down_mid=a.mid;",
    []
  );

  //TRUNCATE `download`;
  await mysql_con.mysql.query(`DELETE FROM download`, []);
  console.log("add aac");
  await mysql_con.mysql.query(
    'INSERT INTO download SELECT CONCAT("C400",media_mid,".m4a"),down_mid,media_mid,size_96aac,is_vip,"","0000-00-00 00:00:00",null,null,null FROM `media` WHERE down_mid is not null and (disk_size_96aac is null AND (size_96aac !=0 or size_96aac!=disk_size_96aac));',
    []
  );

  console.log("add mp3");
  await mysql_con.mysql.query(
    'INSERT INTO download SELECT CONCAT("M800",media_mid,".mp3"),down_mid,media_mid,size_320mp3,2,"","0000-00-00 00:00:00",null,null,null FROM `media` WHERE down_mid is not null and (disk_size_320mp3 is null AND (size_320mp3 !=0 or size_320mp3!=disk_size_320mp3));',
    []
  );

  console.log("add flac");
  await mysql_con.mysql.query(
    'INSERT INTO download SELECT CONCAT("F000",media_mid,".flac"),down_mid,media_mid,size_flac,2,"","0000-00-00 00:00:00",null,null,null FROM `media` WHERE down_mid is not null and (disk_size_flac is null AND (size_flac !=0 or size_flac!=disk_size_flac));',
    []
  );
  await mysql_con.mysql.query(
    "UPDATE (SELECT media_mid,group_concat(album_id) as album_ids,group_concat(mid) as mids FROM song WHERE media_mid in (SELECT media_mid FROM download) and album_id in (SELECT albumID FROM album) GROUP BY media_mid) a INNER JOIN download on a.media_mid=download.media_mid set download.album_ids=a.album_ids,download.down_mid=a.mids;",
    []
  );

  await Promise.all([
    newWorker("getSongDownloadUrl.js", {
      level: 2,
      serverHost: String(fs.readFileSync("../secret/serverHost.secret")),
      serverPort: String(fs.readFileSync("../secret/serverPort.secret")),
    }),
    newWorker("download.js", { PATH }),
    newWorker("getExtraInfo.js", {}),
  ]);

  setTimeout(() => {
    process.exit();
  }, 1000);
})();
