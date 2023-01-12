const PATH = "D:/qsongs/data";
const NEW_PATH = "D:/songs";
const fs = require("fs");
const { replace, mysql } = require("../comm/mysql_con");
const fileType = [
  ["C400", ".m4a", "96aac"],
  ["M800", ".mp3", "320mp3"],
  ["F000", ".flac", "flac"],
];
// /^(C400[a-z\d]+?\.aac)|(M800[a-z\d]+?\.mp3)|(F000[a-z\d]+?\.flac)$/i
const isFileTypeReg = new RegExp(`^${fileType.map(([q, h]) => `(${q}[a-z\\d]+?\\${h})`).join("|")}$`, "i");
// console.log(isFileTypeReg);
// process.exit();
const oldFile = new Map();

const find = async path => {
  for (const h of await fs.promises.readdir(path, { withFileTypes: true })) {
    if (h.isDirectory()) {
      await find(path + "/" + h.name);
    } else if (isFileTypeReg.test(h.name)) {
      oldFile.set(h.name, path + "/" + h.name);
    }
  }
};
//const copyFile=(oldPa)=>new Pr
const tryToMkdir = path => new Promise(r => fs.mkdir(path, r));
(async () => {
  return;
  await find(PATH);
  console.log(oldFile.size);
  const albumSet = new Set();
  const mediaMidMap = new Map();
  // const db = [];
  (
    await mysql.query(
      "SELECT media_mid,mid,album_id FROM song WHERE media_mid in (SELECT media_mid FROM `media` WHERE is_vip is NOT null)",
      []
    )
  ).forEach(item => {
    const { media_mid, album_id } = item;
    if (!mediaMidMap.has(media_mid)) {
      mediaMidMap.set(media_mid, []);
    }
    mediaMidMap.get(media_mid).push(item);
    albumSet.add(album_id);
  });
  console.log(mediaMidMap.get("0031GwuE0JSuR9"));
  console.log("tryToMkdir");
  await tryToMkdir(NEW_PATH);
  await tryToMkdir(NEW_PATH + "/album/");
  await Promise.all([...albumSet].map(path => tryToMkdir(NEW_PATH + "/album/" + path)));

  for (const [media_mid, [firstFile, ...lists]] of mediaMidMap) {
    for (const [q, h, d_name] of fileType) {
      const oldDiskPath = oldFile.get(q + media_mid + h);
      if (oldDiskPath) {
        //console.log(oldDiskPath, media_mid, d_name);
        await replace("media", {
          media_mid,
          ["disk_size_" + d_name]: (await fs.promises.stat(oldDiskPath)).size,
        });
        /** copyFile */
        lists.length &&
          (await Promise.all(
            lists.map(({ mid, album_id }) =>
              fs.promises.copyFile(oldDiskPath, NEW_PATH + "/album/" + album_id + "/" + q + media_mid + h)
            )
          ));

        /** moveFile */
        await fs.promises.rename(oldDiskPath, NEW_PATH + "/album/" + firstFile.album_id + "/" + q + media_mid + h);
        console.log(
          h,
          firstFile.album_id,
          oldDiskPath,
          NEW_PATH + "/album/" + firstFile.album_id + "/" + q + media_mid + h
        );
        //return;
      }
    }
  }
  //   await replace("media", db);

  console.log(mediaMidMap.size, albumSet.size);
})();

(async () => {
  /** 再同步一次disk_size */
  oldFile.clear();
  await find(NEW_PATH);
  console.log("write db");
  const oldFileList = [...oldFile.entries()];
  const sp = 1000;
  let i = 0;
  while (1) {
    const splitList = oldFileList.slice(i * sp, ++i * sp);
    console.log(oldFileList.length - i * sp, splitList.length);
    if (!splitList.length) {
      break;
    }
    await Promise.all(
      splitList.map(
        ([fileName, path]) =>
          new Promise(r => {
            const [q, h, d_name] = fileType.find(([q]) => q === fileName.substring(0, q.length)) || [];
            if (!d_name) {
              console.log("no d_name", fileName, path);
              r();
              return;
            }
            fs.stat(path, (err, d) => {
              if (err || !d || !d.size) {
                console.log("no size", fileName, path);
                r();
                return;
              }
              replace("media", {
                media_mid: fileName.substring(q.length, fileName.indexOf(".")),
                ["disk_size_" + d_name]: d.size,
              }).then(() => {
                // console.log(fileName, "ok");
                r();
              });
            });
          })
      )
    );
  }

  console.log(oldFile.size);
})();
