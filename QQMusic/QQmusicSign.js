var crypto = require("crypto");
var https = require("https");
var MD5 = function (str) {
  return crypto.createHash("md5").update(str).digest("hex");
};
/** main */
var QQmusicSign = (function (c, a) {
  c = Array.from(Buffer.from(c, "base64"));
  var b = function (g) {
    var d = c.slice(8, 24).map(function (h, j) {
      return (parseInt(g[j * 2], 16) * 16) ^ parseInt(g[j * 2 + 1], 16) ^ h;
    });
    var f = [];
    for (var e = 0; e < ((d.length / 3) | 0); e++) {
      f.push(d[e * 3] >> 2);
      f.push(((d[e * 3] & 3) << 4) | (d[e * 3 + 1] >> 4));
      f.push(((d[e * 3 + 1] & 15) << 2) | (d[e * 3 + 2] >> 6));
      f.push(d[e * 3 + 2] & 63);
    }
    f.push(d[e * 3] >> 2);
    f.push((d[e * 3] & 3) << 4);
    return f.map(function (h) {
      return a[h] || "";
    });
  };
  return function (e) {
    e = MD5(e).toLowerCase();
    var d = function (f) {
      return e[f];
    };
    return ["z", "z", "b"]
      .concat(c.slice(0, 8).map(d), b(e), c.slice(24).map(d))
      .join("");
  };
})(
  "FQQJGhAUGx7ULVBEw6Ojy53c/lvMT2gGEgsDAgEHBhk=",
  "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz0123456789"
);

/** 二次封装成更容易使用 */
function getQQmusicData(h, i) {
  var d = Array.isArray(h);
  h = d ? h : [h];
  var j = JSON.stringify(
    h.reduce(
      function (a, b, c) {
        a["req_" + c] = b;
        return a;
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
  https
    .request(
      "https://u.y.qq.com/cgi-bin/musics.fcg?_=" +
        new Date().getTime() +
        "&sign=" +
        QQmusicSign(j),
      { method: "POST" },
      function (b) {
        var a = [];
        b.on("data", function (c) {
          a.push(c);
        });
        b.on("end", function () {
          var c = JSON.parse(String(Buffer.concat(a)));
          c = h.map(function (f, e) {
            return c["req_" + e];
          });
          i(d ? c : c[0]);
        });
      }
    )
    .end(j);
}

/** 使用例子(支持数组。部分接口，如搜索，需要登录，暂时无解) */
// getQQmusicData(
//   [
//     {
//       module: "vkey.GetVkeyServer",
//       method: "CgiGetVkey",
//       param: {
//         guid: "1",
//         songmid: ["003aAPj81VWrbL"],
//         filename: ["C4000032PB2V2QYWSC.m4a", "M8000032PB2V2QYWSC.mp3"],
//         songtype: [0],
//         uin: "1",
//         loginflag: 1,
//         platform: "20",
//       },
//     },
//     {
//       method: "GetPlayLyricInfo",
//       module: "music.musichallSong.PlayLyricInfo",
//       param: {
//         qrc: 1,
//         qrc_t: 0,
//         roma: 0,
//         roma_t: 0,
//         //singerName: "5a+M5aOr5bGx5LiL",
//         songID: 260678,
//         // songName: "6ZmI5aWV6L+F",
//         trans: 0,
//         trans_t: 0,
//         type: 0,
//       },
//     },
//   ],
//   function (d) {
//     console.log(d);
//   }
// );

module.exports = { QQmusicSign, getQQmusicData };
