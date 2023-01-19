const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const { replace } = workerData?.mysql_con || require("../comm/mysql_con");
const { fileType, findSongFile } = require("../comm/index");

const BACKUP_PATH = workerData?.BACKUP_PATH || "D:/qsongs/data";
const PATH = workerData?.PATH || "D:/songs/album";
const Thread = 1000;
(async () => {
  if (!isMainThread) {
    console.log("Worker", __filename, "启动");
  }
  const backupFileMap = await findSongFile(BACKUP_PATH);
  const fileMap = await findSongFile(PATH);
  const fileList = [...new Set([...fileMap.keys(), ...backupFileMap.keys()])];
  const dbMap = new Map();
  let threadDone = 0;
  const newThread = (_, tid) => {
    const fileName = (fileList.splice(0, 1) || [])[0];
    if (!fileName) {
      threadDone++;
      if (threadDone >= Thread) {
        allDone();
      }
      return;
    }
    const path = (fileMap.get(fileName) || [])[0] || (backupFileMap.get(fileName) || [])[0];
    if (!path) {
      newThread(_, tid);
      return;
    }
    fs.stat(path, (err, d) => {
      const type = fileType.find((_, h) => fileName.includes(h));
      if (err || !d || !type) {
        newThread(_, tid);
        return;
      }
      const media_mid = fileName.substring(4, fileName.indexOf(".", 4));
      if (!dbMap.has(media_mid)) {
        dbMap.set(media_mid, { media_mid });
      }
      dbMap.get(media_mid)["disk_size_" + type[2]] = d.size;
      newThread(_, tid);
      return;
    });
  };
  const allDone = async () => {
    if (dbMap.size) {
      await replace("media", [...dbMap.values()]);
    }
    console.log("读取硬盘文件完毕");
    parentPort?.postMessage({ backupFileMap, fileMap });
    process.exit(0);
  };
  Array(Thread).fill(0).forEach(newThread);
})();
