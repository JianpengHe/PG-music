const {
  request,
  GetSingerDetail,
  GetAlbumDetail,
  GetAlbumSongList,
  GetSingerSongList,
  GetAlbumList,
  DoSearchForQQMusicDesktop,
  GetCommentCount,
} = require("../comm/index");
const { XML } = require("../comm/XML");
const { replace, mysql } = require("../comm/mysql_con");
const { getLyric } = require("../LyricDecode/getLyric");

const singer = {
  // "003Nz2So3XXYek": "陈奕迅",
  "0033DUFG3yj0r3": "陈百强",
};
// let replace = async () => {};
const getInfo = async (singer_mid) => {
  const [singerInfo, songList, albumList, searchResult] = await request([
    GetSingerDetail(singer_mid),
    GetSingerSongList(singer_mid),
    GetAlbumList(singer_mid),
    DoSearchForQQMusicDesktop(singer[singer_mid]),
  ]);

  const { basic_info, ex_info, wiki } = singerInfo.singer_list[0];
  const info = {
    singer_id: basic_info.singer_id,
    singer_mid: basic_info.singer_mid,
    name: basic_info.name,
    introduce: ex_info.desc,
    foreign_name: ex_info.foreign_name,
    birthday: new Date(ex_info.birthday),
    song_conut: songList.totalNum,
    album_conut: albumList.total,
    search_conut: searchResult.meta.sum,
    genre: ex_info.genre,
    wiki: JSON.stringify(
      XML.parse(wiki, ({ path }) => path[path.length - 1] === "item").info
    ),
  };
  await replace("singer", info);
  return info;
};

const flat = (arr, ...keys) => {
  const lastKey = keys.splice(-1, 1)[0];
  return keys
    .reduce((arr, key) => arr.map((obj) => obj[key]).flat(), arr)
    .map((obj) => obj[lastKey]);
};

const unFlat = (arr, num, ...count) => {
  const o = Array(Math.ceil(arr.length / num))
    .fill(0)
    .map((_, i) => arr.slice(i * num, (i + 1) * num));
  if (count.length === 0) {
    return o;
  }
  return unFlat(o, ...count);
};

const saveSongList = async (songList) => {
  await replace(
    "song",
    songList.map(
      ({
        id,
        mid,
        name,
        title,
        subtitle,
        singer,
        album,
        interval,
        language,
        genre,
        time_public,
        file,
        bpm,
        index_album,
        tag,
        grp_from_song_id,
      }) => ({
        song_id: id,
        mid,
        name,
        title,
        subtitle,
        singers: JSON.stringify(singer.map(({ id }) => String(id)).sort()),
        singer: singer
          .map(({ name }) => String(name))
          .sort()
          .join("、"),
        album_id: album.id,
        duration: interval,
        language,
        genre,
        time_public: time_public ? new Date(time_public) : null,
        media_mid: file.media_mid,
        bpm,
        index_album,
        tag,
        grp_from_song_id, //: grp ? (grp || []).map(({ id }) => id).join(",") : null,
      })
    )
  );
  await replace(
    "media",
    songList.map(
      ({ file: { media_mid, size_96aac, size_320mp3, size_flac } }) => ({
        media_mid,
        size_96aac,
        size_320mp3,
        size_flac,
      })
    )
  );
};

const getSingerSongList = async (singer_mid, song_conut) => {
  const song_ids = [];
  const Req_Pre_Count = 5;
  const Req_Total = song_conut / GetSingerSongList.MAX_num_per_page;
  for (let i = 0; i < Req_Total / Req_Pre_Count; i++) {
    console.log(singer_mid, "getSingerSongList", i);
    const songList = flat(
      await request(
        Array(Math.min(Req_Pre_Count, Math.ceil(Req_Total - i * Req_Pre_Count)))
          .fill(0)
          .map((_, index) =>
            GetSingerSongList(singer_mid, i * Req_Pre_Count + index)
          )
      ),
      "songList",
      "songInfo"
    ).filter(({ file }) => file?.media_mid);
    await saveSongList(songList);
    songList.forEach(({ id }) => song_ids.push(id));
  }
  return song_ids;
};

const getSingerAlbum = async (singer_mid, album_conut) => {
  console.log(singer_mid, "GetAlbumList");
  const song_ids = [];
  const albumList = [
    ...new Set(
      flat(
        await request(
          Array(Math.ceil(album_conut / GetAlbumList.MAX_num_per_page))
            .fill(0)
            .map((_, index) => GetAlbumList(singer_mid, index))
        ),
        "albumList",
        "albumMid"
      )
    ),
  ];

  const Req_Pre_Count = 10;
  for (let i = 0; i < albumList.length / Req_Pre_Count; i++) {
    console.log(singer_mid, "GetAlbum", i);
    /** 当前处理的专辑列表 */
    const thisAlbumList = albumList.slice(
      i * Req_Pre_Count,
      (i + 1) * Req_Pre_Count
    );
    const songList = flat(
      await request(thisAlbumList.map(GetAlbumSongList)),
      "songList",
      "songInfo"
    ).filter(({ file }) => file?.media_mid);
    await Promise.all([
      replace(
        "album",
        (
          await request(thisAlbumList.map(GetAlbumDetail))
        ).map(
          ({
            basicInfo: {
              albumID,
              albumMid,
              albumName,
              albumType,
              publishDate,
              genre,
              desc,
            },
            company,
            singer,
          }) => ({
            albumID,
            albumMid,
            albumName,
            albumType,
            publishDate,
            genre,
            company: company.name,
            singer: JSON.stringify(
              ((singer || {}).singerList || [])
                .map(({ singerID }) => String(singerID))
                .sort()
            ),
            introduce: desc,
          })
        )
      ),
      saveSongList(songList),
    ]);
    songList.forEach(({ id }) => song_ids.push(id));
  }
  return song_ids;
};

const searchSingerSongList = async (singer_mid, search_conut, song_ids) => {
  const Req_Pre_Count = 5;
  const Req_Total = search_conut / DoSearchForQQMusicDesktop.MAX_num_per_page;
  for (let i = 0; i < Req_Total / Req_Pre_Count; i++) {
    console.log(singer_mid, "DoSearchForQQMusicDesktop", i);
    const list = flat(
      await request(
        Array(Math.min(Req_Pre_Count, Math.ceil(Req_Total - i * Req_Pre_Count)))
          .fill(0)
          .map((_, index) =>
            DoSearchForQQMusicDesktop(
              singer[singer_mid],
              i * Req_Pre_Count + index
            )
          )
      ),
      "body",
      "song",
      "list"
    ).flat();
    for (const item of list) {
      if (item.grp_from_song_id === undefined) {
        item.grp_from_song_id = item.id;
      }
      if (Array.isArray(item.grp)) {
        item.grp.forEach((sub_grp) => {
          sub_grp.grp_from_song_id = item.id;
          list.push(sub_grp);
        });
        delete item.grp;
      }
    }
    await saveSongList(
      list.filter(({ id, file }) => song_ids.has(id) && file?.media_mid)
    );
  }
};

const commentCount = async () => {
  const song_ids = flat(
    await mysql.query(
      "SELECT song_id FROM `song` WHERE `comment_count` IS NULL",
      []
    ),
    "song_id"
  );
  for (const req of unFlat(song_ids, 25, 10)) {
    console.log("GetCommentCount");
    await replace(
      "song",
      flat(await request(req.map(GetCommentCount), false), "response_list")
        .flat()
        .map(({ biz_id, count }) => ({
          song_id: Number(biz_id),
          comment_count: count,
        }))
    );
    //return;
  }
};

const getLyrics = async () => {
  const songList = await mysql.query(
    "SELECT song_id,singer,name FROM `song` WHERE `lyric` IS NULL ORDER BY `song_id` ASC",
    []
  );
  let i = 0;
  for (const req of unFlat(songList, 20)) {
    console.log("getLyrics", songList.length - i * 20, i);
    i++;
    await replace(
      "song",
      (await getLyric(req)).filter(({ song_id }) => song_id)
    );
    // return;
  }
};

(async () => {
  for (const singer_mid of Object.keys(singer)) {
    const { song_conut, album_conut, search_conut } = await getInfo(singer_mid);
    console.log(
      "歌曲数",
      song_conut,
      "专辑数",
      album_conut,
      "搜索结果数",
      search_conut
    );
    const song_ids = new Set([
      ...(await getSingerSongList(singer_mid, song_conut)),
      ...(await getSingerAlbum(singer_mid, album_conut)),
    ]);
    // replace = require("../comm/mysql_con").replace;
    await searchSingerSongList(singer_mid, search_conut, song_ids);
  }
  // await commentCount();
  await getLyrics();
  setTimeout(() => {
    process.exit();
  }, 1000);
})();
