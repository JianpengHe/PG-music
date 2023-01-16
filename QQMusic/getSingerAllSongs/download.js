const https = require("https");
const fs = require("fs");
const { mysql, replace } = require("../comm/mysql_con");
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 15,
  maxFreeSockets: 15,
});
const Thread = 6;
const ThreadRand = 12345;
const PATH = "D:/songs/album";

const sleep = time => new Promise(r => setTimeout(() => r(), time));
const albumList = new Set();

const download = ({ file_name, album_ids, url }) =>
  new Promise(r =>
    https.get(
      "https://dl.stream.qqmusic.qq.com/" + url,
      {
        agent: keepAliveAgent,
        rejectUnauthorized: false,
      },
      res => {
        const body = [];
        res.on("data", c => body.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(body);
          Promise.all(
            String(album_ids)
              .split(",")
              .map(
                album_id =>
                  new Promise(r2 => {
                    if (!albumList.has(Number(album_id))) {
                      console.log("创建文件夹", album_id);
                      albumList.add(Number(album_id));
                      try {
                        fs.mkdirSync(`${PATH}/${album_id}`);
                      } catch (e) {}
                    }
                    if (!buf.length) {
                      r(1);
                      return;
                    }
                    fs.writeFile(`${PATH}/${album_id}/${file_name}`, buf, r2);
                  })
              )
          )
            .then(res =>
              replace("download", { file_name, thread_lock: null, disk_size: res.some(err => err) ? 0 : buf.length })
            )
            .then(r);
        });
      }
    )
  );
const newThread = async (_, tid) => {
  tid += ThreadRand;
  console.log("启动线程", tid);
  await mysql.query("UPDATE download set thread_lock =null where thread_lock =?;", [tid]);
  while (1) {
    const { affectedRows } = await mysql.query(
      `UPDATE (SELECT file_name FROM download WHERE expire>now() and url is not null and thread_lock is null and disk_size is null ORDER BY expire DESC LIMIT 10) a INNER JOIN download on a.file_name=download.file_name set download.thread_lock=?`,
      [tid]
    );
    if (!affectedRows) {
      console.log("线程", tid, "空闲");
      await sleep(5000);
      continue;
    }
    const downloadInfo = await mysql.query(
      `SELECT file_name,album_ids,url FROM download WHERE  thread_lock =? and url is not null`,
      [tid]
    );
    if (!downloadInfo.length) {
      console.log("线程", tid, "空闲2");
      await sleep(5000);
      continue;
    }
    const result = await Promise.all(downloadInfo.map(download));
    console.log("线程", tid, "完成了", result.length);
    // await mysql.query(`UPDATE download SET disk_size = '1' WHERE `download`.`file_name` = 'C40000000b303YuzVs.m4a';`)
  }
};

fs.readdirSync(PATH).forEach(a => albumList.add(Number(a)));

Array(Thread).fill(0).forEach(newThread);
