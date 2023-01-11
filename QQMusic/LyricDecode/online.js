const { LyricDecode } = require(`./QQMusicLyricDecode_node-v${
  process.version.match(/^v(\d{1,2})\./)[1]
}-win-x86.node`);
const { getQQmusicData } = require("../QQmusicSign.js");
const zlib = require("zlib");

const getLyricOnline = (songID) =>
  new Promise((r) => {
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
          songID,
          // songName: "6ZmI5aWV6L+F",
          trans: 0,
          trans_t: 0,
          type: 0,
        },
      },
      ({ data }) => {
        const { lyric } = data || {};
        if (!lyric) {
          throw new Error("获取歌词失败");
        }
        const lyricBuf = Buffer.from(lyric, "hex");
        zlib.inflate(LyricDecode(lyricBuf, lyricBuf.length), (err, result) => {
          if (err) {
            throw err;
          }
          console.log(String(result));
          r(String(result));
        });
      }
    );
  });
if (process.argv[1].includes("online")) {
  getLyricOnline(Number(process.argv[2] || 260677)).then((a) =>
    console.log(String(a).replace(/[\ue000-\uf8ff]/g, ""), a)
  );
}

module.exports = { getLyricOnline };
