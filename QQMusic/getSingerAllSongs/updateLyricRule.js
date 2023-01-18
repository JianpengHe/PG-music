const cluster = require("cluster");
const Thread = 8;

if (cluster.isPrimary) {
  (async () => {
    const { replace, mysql } = require("../comm/mysql_con");
    const LIMIT = 5000;
    const songList = [];
    let i = 0;

    do {
      console.log("获取", i);
      const res = await mysql.query(
        "SELECT song_id,singer,name FROM `song` ORDER BY `song_id` ASC LIMIT ?," + LIMIT + ";",
        [i]
      );
      if (!res.length) {
        break;
      }
      res.forEach(a => {
        a.singer = String(a.singer);
        songList.push(a);
      });
      i += LIMIT;
    } while (!(songList.length % 0));
    //console.log(songList);
    const done = new Map();
    let doneThread = 0;

    const newWorker = () => {
      const worker = cluster.fork();
      const { pid } = worker.process;
      // new Worker(__filename, {
      //   workerData: { tid },
      // });
      const getNewWork = () => {
        let work;
        if (songList.length === 0 || !(work = songList.splice(0, 1)[0])) {
          console.log("线程", pid, "已完成");
          // worker.exit();
          // process.kill(pid, 9);
          // worker.process;
          doneThread++;
          if (doneThread === Thread) {
            allThreadDone();
          }
        }
        if (work) {
          worker.send(work);
        }
      };
      worker.on("message", d => {
        if (d) {
          done.set(d.song_id, d);
        }
        getNewWork();
      });
      worker.on("error", err => {
        console.log(tid, err);
      });
      worker.on("exit", code => {
        if (code !== 0) {
          console.log(new Error(`Worker stopped with exit code ${code}`));
        }
        console.log("线程", pid, "退出");
        doneThread++;
        if (doneThread === Thread) {
          allThreadDone();
        }
      });
      getNewWork();
    };
    console.time("time");
    Array(Thread).fill(0).forEach(newWorker);
    const allThreadDone = () => {
      console.log("所有线程已完成");
      console.timeEnd("time");
      console.log("正在写入数据库：", done.size);
      replace("song", [...done.values()]).then(() => {
        process.exit();
      });
    };
  })();
} else {
  // const script = workerData;
  const fs = require("fs");
  const zlib = require("zlib");
  const { encode } = require("../LyricDecode/convert");
  const { LyricDecode } = require(`../LyricDecode/index`);

  //const { tid } = workerData;
  console.log("子线程", process.pid, "启动");
  const parentPort = process;
  parentPort.on("message", ({ song_id, singer, name }) => {
    fs.readFile(`../LyricDecode/lyric_file/${song_id}.qqlyric`, (err, lyric) => {
      if (err || !lyric) {
        console.log("没有", song_id, singer, name, "的歌词文件");
        parentPort.send(null);
        return;
      }
      if (lyric.length) {
        zlib.inflate(LyricDecode(lyric, lyric.length), (err, d) => {
          if (err || !d) {
            parentPort.send({ lyric: null, song_id });
            return;
          }
          const delSongInfos = String(singer).split("、");
          // name && delSongInfos.push(name);
          parentPort.send({
            lyric: encode(String(d), delSongInfos),
            song_id,
          });
        });
        return;
      }
      parentPort.send({ lyric: "", song_id });
    });
  });
}
