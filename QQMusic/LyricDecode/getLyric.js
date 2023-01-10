const { LyricDecode } = require(`./QQMusicLyricDecode_node-v${
  process.version.match(/^v(\d{1,2})\./)[1]
}-win-x86.node`);
const { encode } = require("./convert");
const { request, GetPlayLyricInfo } = require("../comm/index");
const zlib = require("zlib");
const fs = require("fs");
const PATH = __dirname + "/lyric_file/";
const save_request_cache = ({ data: { songID, lyric }, item }) => {
  fs.writeFile(
    PATH + (songID || item?.param?.songID) + ".qqlyric",
    Buffer.from(lyric, "hex"),
    () => {}
  );
};
const read_request_cache = (ob) =>
  new Promise((r) => {
    const { songID } = ob.item.param;
    fs.readFile(PATH + songID + ".qqlyric", (err, lyric) => {
      if (lyric) {
        ob.data = { lyric, songID };
      }
      r();
    });
  });
const getLyric = async (song_ids) =>
  await Promise.all(
    (
      await request(
        (song_ids[0].song_id
          ? song_ids.map(({ song_id }) => song_id)
          : song_ids
        ).map(GetPlayLyricInfo),
        (ob) => {
          ob.save_request_cache = save_request_cache;
          ob.read_request_cache = read_request_cache;
        }
      )
    ).map(
      ({ lyric, songID }, i) =>
        new Promise((r) => {
          if (!(lyric instanceof Buffer)) {
            lyric = Buffer.from(lyric || "", "hex");
          }

          if (lyric.length) {
            zlib.inflate(LyricDecode(lyric, lyric.length), (err, d) => {
              if (err || !d) {
                r({ lyric: null, song_id: songID });
                return;
              }
              const delSongInfos = song_ids[i].singer
                ? String(song_ids[i].singer).split("、")
                : [];
              // song_ids[i].name && delSongInfos.push(song_ids[i].name);

              r({ lyric: encode(String(d), delSongInfos), song_id: songID });
            });
            return;
          }
          r({ lyric: "", song_id: songID });
        })
    )
  );
module.exports = { getLyric };

//getLyric([5981]).then((a) => console.log(a));
