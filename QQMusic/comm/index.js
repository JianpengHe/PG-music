const fs = require("fs");
const zlib = require("zlib");
const https = require("https");
const crypto = require("crypto");
// const { QQmusicSign } = require("../QQmusicSign.js");
const MD5 = (str) => crypto.createHash("md5").update(str).digest("hex");
const keySort = (obj) => {
  if (obj instanceof Object && !Array.isArray(obj)) {
    return Object.keys(obj)
      .sort()
      .reduce((o, current) => ({ ...o, [current]: keySort(obj[current]) }), {});
  }
  return obj;
};
const readFile = (obj) =>
  new Promise((r) =>
    fs.readFile(__dirname + "/request_cache/" + obj.path, (err, file) => {
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
const requestQQmusic = (reqBody, cb, useCookie, err = 0) => {
  if (err > 5) {
    console.log(reqBody);
    throw new Error("err too more");
  }
  const error = (e) => {
    console.log(e);
    setTimeout(() => requestQQmusic(reqBody, cb, useCookie, err + 1), 3000);
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
          Cookie:
            useCookie === true
              ? qqMusicCookie ||
                (qqMusicCookie = String(
                  fs.readFileSync(__dirname + "/../secret/qqMusicCookie.secret")
                ).trim())
              : useCookie || "",
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
const request = async (req) => {
  const isArray = Array.isArray(req);
  req = isArray ? req : [req];
  let useCookie = false;
  const objs = req.map((item) => {
    item.param = keySort(item.param);
    if (item.method === "DoSearchForQQMusicDesktop") {
      useCookie = true;
    }
    return {
      item,
      path: `${item.method}.${MD5(JSON.stringify(item.param))}.deflate`,
      data: null,
    };
  });

  await Promise.all(objs.map(readFile));
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
  //console.log(reqBody);
  const res = await new Promise((r) => requestQQmusic(reqBody, r, useCookie));
  needReq.forEach((obj, index) => {
    const data = res["req_" + index];
    if (data?.code !== 0) {
      //console.log(res);
      throw new Error("code is not 0");
    }
    obj.data = data.data;
    zlib.deflate(Buffer.from(JSON.stringify(data.data)), (err, file) => {
      if (err || !file) {
        return;
      }
      fs.writeFile(__dirname + "/request_cache/" + obj.path, file, () => {});
    });
  });
  return isArray ? objs.map(({ data }) => data) : objs[0].data;
};

module.exports = { keySort, request };
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
