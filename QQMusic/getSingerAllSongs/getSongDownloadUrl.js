const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const https = require("https");
const fs = require("fs");
/** 请先运行存储过程“创建下载列表” */
const { replace, mysql } = require("../comm/mysql_con");
// const { request } = require("../comm/index");
const server = `https://${String(workerData?.serverHost ?? fs.readFileSync("../secret/serverHost.secret"))}:${String(
  workerData?.serverPort ?? fs.readFileSync("../secret/serverPort.secret")
)}/getPlayUrl`;
/** 0.未登录 1.免费试听 2.VIP用户 */
const level = workerData?.level ?? Number(process.argv[2] || 0);
const sleep = time => new Promise(r => setTimeout(r, time));
const get = url =>
  new Promise(r =>
    https.get(url, { rejectUnauthorized: false }, res => {
      const body = [];
      res.on("data", c => body.push(c));
      res.on("end", () => r(JSON.parse(String(Buffer.concat(body)))));
    })
  );
(async () => {
  if (!isMainThread) {
    console.log("Worker", __filename, "启动");
  }
  //return
  let split = [];
  while (
    (split = await mysql.query(
      `SELECT file_name,down_mid FROM download WHERE down_mid is not null and level <=${level} and disk_size is null and expire<now() and thread_lock is null ORDER BY down_mid ASC LIMIT 20`,
      []
    )).length
  ) {
    //const map = new Map(split.map(obj => [obj.file_name, obj]));

    const db = (
      await get(
        `${server}?${split
          .map(({ file_name, down_mid }) => `filename=${file_name}&songmid=${String(down_mid).split(",")[0]}`)
          .join("&")}`
      )
    )
      //.filter(({ filename, purl }) => filename && purl)
      //.sort((a, b) => a.down_mid > b.down_mid)
      .map(({ filename, purl }, i) => ({
        file_name: filename || split[i].file_name,
        down_mid: purl
          ? String(split[i].down_mid).split(",")[0]
          : String(split[i].down_mid).split(",").slice(1).join(",") || null,
        url: purl || null,
        expire: purl ? new Date(new Date().getTime() + 80000000) : "0000-00-00 00:00:00",
      }));

    await replace("download", db);
    const count = db.filter(({ url }) => url).length;
    await sleep(count * Math.random() * 250 + 4000);
    //}
    // await sleep(2000);

    console.log(
      "剩余",
      (
        await mysql.query(
          `SELECT COUNT(*) as n FROM download WHERE down_mid is not null and level <=${level} and disk_size is null and expire<now() and thread_lock is null`,
          []
        )
      )[0].n,
      count
    );
  }
  process.exit(0);
  // console.log(list);
})();
