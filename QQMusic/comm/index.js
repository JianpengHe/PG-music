const fs = require("fs");
const zlib = require("zlib");
const https = require("https");
const crypto = require("crypto");
// const { QQmusicSign } = require("../QQmusicSign.js");

/** 请求的频率 */
const Req_Valve = 2000;

let last_req_time = 0;

const MD5 = str => crypto.createHash("md5").update(str).digest("hex");
const keySort = obj => {
  if (obj instanceof Object && !Array.isArray(obj)) {
    return Object.keys(obj)
      .sort()
      .reduce((o, current) => ({ ...o, [current]: keySort(obj[current]) }), {});
  }
  return obj;
};
const readAction = songInfo => {
  const { action, pay, file } = songInfo;
  if (!action) {
    return;
  }
  action.play = 0;
  songInfo.disabled = 0;
  songInfo.tryIcon = 0;
  if (action.switch !== undefined) {
    const bit = action.switch.toString(2).split("");
    bit.pop();
    bit.reverse();
    [
      "play_lq",
      "play_hq",
      "play_sq",
      "down_lq",
      "down_hq",
      "down_sq",
      "soso",
      "fav",
      "share",
      "bgm",
      "ring",
      "sing",
      "radio",
      "try",
      "give",
      "poster",
      "play_5_1",
      "down_5_1",
      "bullet",
      "cache_lq",
      "cache_hq",
      "cache_sq",
      "cache_dts",
      "track_pay",
    ].forEach((k, p) => {
      action[k] = parseInt(bit[p], 10) || 0;
    });
  }
  if (action.icons !== undefined) {
    const icons = action.icons.toString(2).split("");
    icons.reverse();
    songInfo.copyright = parseInt(icons[0], 10);
    songInfo.isVip = parseInt(icons[18], 10);
  }
  if (action.play_lq || action.play_hq || action.play_sq || action.play_5_1) {
    action.play = 1;
  }
  if (action.try && (file?.size_try ?? 0) > 0) {
    songInfo.tryPlay = 1;
  }
  if (!(action.play || pay?.pay_play || pay?.pay_down)) {
    if (songInfo.tryPlay) {
      songInfo.tryIcon = 1;
    } else {
      songInfo.disabled = 1;
    }
  }
};

const sleep = time => new Promise(r => setTimeout(() => r(), time));
// fs.mkdir(__dirname + "/request_cache/", () => {});
const readFile = obj =>
  new Promise(r =>
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
  const error = e => {
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
          "User-Agent": "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)",
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
const save_request_cache = obj => {
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
  const objs = req.map(item => {
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
        ? `${__dirname}/request_cache/${item.method}.${MD5(JSON.stringify(item.param))}.deflate`
        : useCache(ob));
    return ob;
  });

  if (useCache) {
    await Promise.all(objs.map(obj => obj.read_request_cache(obj)));
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
  await sleep(last_req_time + Req_Valve + Math.ceil(Math.random() * 3000) - (last_req_time = new Date().getTime()));
  let errTimes = 0;
  while (1) {
    const res = await new Promise(r => requestQQmusic(reqBody, r));
    if (
      !needReq.some((obj, index) => {
        const data = res["req_" + index];
        if (data?.code !== 0 && data?.code !== 24001) {
          /** 请求过于频繁 */
          if (data?.code === 2001) {
            console.log("第", ++errTimes, "次", "请求过于频繁");
            return true;
          }
          console.log(req, data, JSON.stringify(data));
          throw new Error("code is not 0");
        }
        obj.data = data.data;
        if (useCache) {
          obj.save_request_cache(obj);
        }
      })
    ) {
      break;
    }
    if (errTimes > 5) {
      console.log(reqBody);
      throw new Error("请求失败太多");
    }
    await sleep(5000 * errTimes);
  }
  return isArray ? objs.map(({ data }) => data) : objs[0].data;
};

const GetSingerDetail = singer_mid => ({
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

const GetAlbumDetail = albumMid => ({
  module: "music.musichallAlbum.AlbumInfoServer",
  method: "GetAlbumDetail",
  param: { albumMid },
});
const GetAlbumSongList = albumMid => ({
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

const GetCommentCount = ids => ({
  module: "GlobalComment.GlobalCommentReadServer",
  method: "GetCommentCount",
  param: {
    request_list: ids.map(id => ({
      biz_type: 1,
      biz_id: String(id),
      biz_sub_type: 1,
    })),
  },
});

const GetPlayLyricInfo = songID => ({
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

const getFansCount = singerMid =>
  new Promise(r =>
    https.get(
      `https://c.y.qq.com/rsc/fcgi-bin/fcg_order_singer_getnum.fcg?_=${new Date().getTime()}&uin=0&format=json&inCharset=utf-8&outCharset=utf-8&notice=0&platform=wk_v17&needNewCode=0&singermid=${singerMid}&utf8=1`,
      { headers: { referer: "https://y.qq.com/wk_v17" } },
      async res => {
        const body = [];
        for await (const chuck of res) {
          body.push(chuck);
        }
        r(JSON.parse(String(Buffer.concat(body))).num);
      }
    )
  );

const fileType = [
  ["C400", ".m4a", "96aac"],
  ["M800", ".mp3", "320mp3"],
  ["F000", ".flac", "flac"],
];
const findSongFile = async Path => {
  // /(C400[a-z\d]+?\.m4a)|(M800[a-z\d]+?\.mp3)|(F000[a-z\d]+?\.flac)$/i
  const isFileTypeReg = new RegExp(`${fileType.map(([q, h]) => `(${q}[a-z\\d]+?\\${h})`).join("|")}$`, "i");

  const fileMap = new Map();

  const find = async path => {
    for (const h of await fs.promises.readdir(path, { withFileTypes: true })) {
      let reg;
      if (h.isDirectory()) {
        await find(path + "/" + h.name);
      } else if ((reg = h.name.match(isFileTypeReg)) && reg[0]) {
        if (!fileMap.has(reg[0])) {
          fileMap.set(reg[0], []);
        }
        fileMap.get(reg[0]).push(path + "/" + h.name);
      }
    }
  };
  await find(Path);
  return fileMap;
};

module.exports = {
  keySort,
  request,
  readAction,
  GetAlbumDetail,
  GetAlbumSongList,
  GetSingerDetail,
  GetSingerSongList,
  GetAlbumList,
  DoSearchForQQMusicDesktop,
  GetCommentCount,
  GetPlayLyricInfo,
  getFansCount,
  fileType,
  findSongFile,
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
