const fs = require("fs");
const zlib = require("zlib");
const https = require("https");
const crypto = require("crypto");
// const { QQmusicSign } = require("../QQmusicSign.js");

/** 请求的频率 */
const Req_Valve = 2000;

let last_req_time = 0;

const MD5 = (str) => crypto.createHash("md5").update(str).digest("hex");
const keySort = (obj) => {
  if (obj instanceof Object && !Array.isArray(obj)) {
    return Object.keys(obj)
      .sort()
      .reduce((o, current) => ({ ...o, [current]: keySort(obj[current]) }), {});
  }
  return obj;
};
const sleep = (time) => new Promise((r) => setTimeout(() => r(), time));
// fs.mkdir(__dirname + "/request_cache/", () => {});
const readFile = (obj) =>
  new Promise((r) =>
    fs.readFile(obj.path, (err, file) => {
      if (err || !file) {
        r(obj);
        return;
      }
      zlib.inflate(file, (err, res) => {
        if (err || !res) {
          r(obj);
          return;
        }
        try {
          obj.data = JSON.parse(String(res).trim());
          r(obj);
        } catch (e) {
          r(obj);
        }
      });
    })
  );
const requestQQmusic = (reqBody, cb, err = 0) => {
  if (err > 5) {
    console.log(reqBody);
    throw new Error("err too more");
  }
  const error = (e) => {
    console.log(e);
    setTimeout(() => requestQQmusic(reqBody, cb, err + 1), 3000);
  };
  https
    .request(
      "https://u.y.qq.com/cgi-bin/musicu.fcg?_=" + new Date().getTime(),
      {
        method: "POST",
        headers: {
          Accept: "*/*",
          "Accept-Language": "zh-CN",
          "User-Agent":
            "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)",
          Cookie: "uin=10849964;",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      function (b) {
        var a = [];
        b.on("data", function (c) {
          a.push(c);
        });
        b.on("end", function () {
          try {
            var res = JSON.parse(String(Buffer.concat(a)));
            //console.log(res);
            if (res.code) {
              throw new Error("code not 0");
            }
            cb(res);
          } catch (e) {
            error(e);
          }
        });
        b.on("error", error);
      }
    )
    .on("error", error)
    .end(reqBody);
};
const save_request_cache = (obj) => {
  zlib.deflate(Buffer.from(JSON.stringify(obj.data)), (err, file) => {
    if (err || !file) {
      return;
    }
    fs.writeFile(obj.path, file, () => {});
  });
};
const request = async (req, useCache = true) => {
  const isArray = Array.isArray(req);
  req = isArray ? req : [req];
  const objs = req.map((item) => {
    item.param = keySort(item.param);
    const ob = {
      item,
      path: "",
      data: null,
      save_request_cache,
      read_request_cache: readFile,
    };
    ob.path =
      useCache &&
      (useCache === true
        ? `${__dirname}/request_cache/${item.method}.${MD5(
            JSON.stringify(item.param)
          )}.deflate`
        : useCache(ob));
    return ob;
  });

  if (useCache) {
    await Promise.all(objs.map((obj) => obj.read_request_cache(obj)));
  }

  const needReq = objs.filter(({ data }) => !data);
  if (!needReq.length) {
    return isArray ? objs.map(({ data }) => data) : objs[0].data;
  }

  const reqBody = JSON.stringify(
    needReq.reduce(
      (obj, { item }, index) => {
        obj["req_" + index] = item;
        return obj;
      },
      {
        comm: {
          format: "json",
          inCharset: "utf-8",
          outCharset: "utf-8",
          notice: 0,
          platform: "yqq.json",
          needNewCode: 1,
          uin: "1",
        },
      }
    )
  );
  await sleep(
    last_req_time + Req_Valve - (last_req_time = new Date().getTime())
  );
  const res = await new Promise((r) => requestQQmusic(reqBody, r));
  needReq.forEach((obj, index) => {
    const data = res["req_" + index];
    if (data?.code !== 0 && data?.code !== 24001) {
      console.log(data, req);
      throw new Error("code is not 0");
    }
    obj.data = data.data;
    if (useCache) {
      obj.save_request_cache(obj);
    }
  });
  return isArray ? objs.map(({ data }) => data) : objs[0].data;
};

const GetSingerDetail = (singer_mid) => ({
  module: "music.musichallSinger.SingerInfoInter",
  method: "GetSingerDetail",
  param: {
    singer_mids: [singer_mid],
    pic: 1,
    group_singer: 1,
    wiki_singer: 1,
    ex_singer: 1,
  },
});

const GetAlbumDetail = (albumMid) => ({
  module: "music.musichallAlbum.AlbumInfoServer",
  method: "GetAlbumDetail",
  param: { albumMid },
});
const GetAlbumSongList = (albumMid) => ({
  module: "music.musichallAlbum.AlbumSongList",
  method: "GetAlbumSongList",
  param: { albumMid, begin: 0, num: 999, order: 2 },
});

const GetSingerSongList = (singerMid, start = 0) => ({
  module: "music.musichallSong.SongListInter",
  method: "GetSingerSongList",
  param: {
    singerMid,
    begin: start * GetSingerSongList.MAX_num_per_page,
    num: GetSingerSongList.MAX_num_per_page,
    order: 1,
  },
});
GetSingerSongList.MAX_num_per_page = 100;

const GetAlbumList = (singermid, start = 0) => ({
  module: "music.musichallAlbum.AlbumListServer",
  method: "GetAlbumList",
  param: {
    sort: 5,
    singermid,
    begin: start * GetAlbumList.MAX_num_per_page,
    num: GetAlbumList.MAX_num_per_page,
  },
});
GetAlbumList.MAX_num_per_page = 80;

const DoSearchForQQMusicDesktop = (query, start = 0) => ({
  module: "music.search.SearchCgiService",
  method: "DoSearchForQQMusicDesktop",
  param: {
    num_per_page: DoSearchForQQMusicDesktop.MAX_num_per_page,
    page_num: start + 1,
    query,
    search_type: 0,
  },
});
DoSearchForQQMusicDesktop.MAX_num_per_page = 60;

const GetCommentCount = (ids) => ({
  module: "GlobalComment.GlobalCommentReadServer",
  method: "GetCommentCount",
  param: {
    request_list: ids.map((id) => ({
      biz_type: 1,
      biz_id: String(id),
      biz_sub_type: 1,
    })),
  },
});

const GetPlayLyricInfo = (songID) => ({
  module: "music.musichallSong.PlayLyricInfo",
  method: "GetPlayLyricInfo",
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
});

module.exports = {
  keySort,
  request,
  GetAlbumDetail,
  GetAlbumSongList,
  GetSingerDetail,
  GetSingerSongList,
  GetAlbumList,
  DoSearchForQQMusicDesktop,
  GetCommentCount,
  GetPlayLyricInfo,
};
// console.log(keySort({ c: 99, a: { d: 5, c: [3, 2, 1] } }));

// request({
//   module: "music.musichallAlbum.AlbumListServer",
//   method: "GetAlbumList",
//   param: {
//     sort: 5,
//     singermid: "003Nz2So3XXYek",
//     begin: 80,
//     num: 80,
//   },
// }).then((data) => {
//   console.log(data, data.albumList.length);
// });
