/** 添加host文件：127.0.0.6 u.y.qq.com */
const { getQQmusicData } = require("./QQmusicSign.js");
const https = require("https");
const fs = require("fs");
const zlib = require("zlib");
const { LyricDecode } = require(`./LyricDecode/index`);
const { encode } = require("./LyricDecode/convert");

/** u.y.qq.com的自签证书，也可以使用PG的公共证书签发平台 */
const options = JSON.parse(String(fs.readFileSync("secret/u.y.qq.com.secret")));
const serverPort = Number(String(fs.readFileSync("secret/serverPort.secret")));
let cookie = "";
fs.readFile("secret/qqMusicCookie.secret", (err, d) => {
  if (!err && d) {
    cookie = String(d);
  }
});
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 1,
  maxFreeSockets: 1,
});
// const recvAll = stream =>
//   new Promise((resolve, reject) => {
//     const body = [];
//     stream.on("data", chuck => body.push(chuck));
//     stream.once("end", () => resolve(Buffer.concat(body)));
//     stream.once("error", reject);
//   });
https
  .createServer(options, (req, res) => {
    if (req.headers?.cookie && String(req.headers.cookie).includes("qqmusic_gkey=")) {
      const newCookie = req.headers.cookie.replace(/qqmusic_fromtag=\d+?;/g, "").trim();
      if (cookie !== newCookie) {
        cookie = newCookie;
        fs.writeFile("secret/qqMusicCookie.secret", newCookie, () => {
          console.log(new Date().toLocaleString(), "更新cookie", newCookie);
        });
      }
    }
    // console.log(req.headers.host);
    const req2 = https.request(
      {
        host: "183.47.112.109",
        path: req.url,
        rejectUnauthorized: false,
        headers: req.headers,
        method: req.method,
        agent: keepAliveAgent,
      },
      res2 => {
        res2.on("error", () => {});
        res.writeHead(res2.statusCode, res2.headers);
        res2.pipe(res);
      },
    );
    // recvAll(req).then(d => {
    //   req2.end(d);

    //   console.log(String(d));
    // });
    req.pipe(req2);
    req.on("error", () => {});
    res.on("error", () => {});
    req2.on("error", () => {});
  })
  .listen(443, "127.0.0.6");
const getSongVkey = (songmid, filename, cb) =>
  getQQmusicData(
    {
      module: "vkey.GetVkeyServer",
      method: "CgiGetVkey",
      param: {
        guid: "1",
        songmid,
        filename,
        songtype: [0],
        loginflag: 1,
        platform: "20",
      },
    },
    ({ data }) =>
      cb(
        (data?.midurlinfo || []).map(({ result, songmid, filename, purl }) => ({
          result,
          songmid,
          filename,
          purl,
        })),
      ),

    cookie,
  );
const setControlHeader = (res, time) => {
  const now = new Date();
  res.setHeader("cache-control", "max-age=" + time);
  res.setHeader("expires", new Date(now.getTime() + time * 1000).toUTCString());
  res.setHeader("last-modified", now.toUTCString());
};
https
  .createServer(options, (req, res) => {
    req.on("error", () => {});
    res.on("error", () => {});
    res.setHeader("content-type", "application/json; charset=utf-8");
    const { pathname, searchParams } = new URL("http://127.0.0.1" + req.url);
    let regExp = null;
    if (pathname === "/getPlayUrl") {
      const songmid = searchParams.getAll("songmid").slice(0, 20);
      const filename = searchParams.getAll("filename").slice(0, 20);
      if (!songmid.length || !filename.length) {
        res.end("[]");
        return;
      }
      getSongVkey(songmid, filename, d => {
        res.end(JSON.stringify(d));
      });
      return;
    }

    if ((regExp = pathname.match(/^\/play\/([a-z\d\.]+?)\.vkey$/i))) {
      const filename = regExp[1];
      const songmid = searchParams.getAll("songmid")[0];
      if (!songmid) {
        res.statusCode = 406;
        res.end("{}");
        return;
      }
      getSongVkey([songmid], [filename], ([d]) => {
        console.log(new Date().toLocaleString(), "getSongVkey", songmid, filename);
        if (d.purl) {
          setControlHeader(res, 80000);
        }
        res.end(JSON.stringify(d));
      });

      return;
    }

    if ((regExp = pathname.match(/^\/lyric\/(\d+)\.lyric$/))) {
      const songid = Number(regExp[1]);
      if (!songid) {
        res.end("");
        return;
      }
      getQQmusicData(
        {
          method: "GetPlayLyricInfo",
          module: "music.musichallSong.PlayLyricInfo",
          param: {
            qrc: 1,
            qrc_t: 0,
            roma: 0,
            roma_t: 0,
            //singerName: "5a+M5aOr5bGx5LiL",
            songID: songid,
            // songName: "6ZmI5aWV6L+F",
            trans: 0,
            trans_t: 0,
            type: 0,
          },
        },
        ({ data }) => {
          const { lyric } = data || {};
          if (!lyric) {
            // throw new Error("获取歌词失败");
            res.end("");
            return;
          }
          const lyricBuf = Buffer.from(lyric, "hex");
          zlib.inflate(LyricDecode(lyricBuf, lyricBuf.length), (err, result) => {
            if (err) {
              console.log(err);
              res.end("");
              return;
            }
            const lyricText = encode(String(result), searchParams.getAll("delSongInfos"));
            if (lyricText) {
              setControlHeader(res, 360 * 86400);
            }
            res.end(lyricText);
          });
        },
      );
      return;
    }

    res.statusCode = 404;
    res.end("404");
  })
  .listen(serverPort, "0.0.0.0");
