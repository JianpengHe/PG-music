const fs = require("fs");
const zlib = require("zlib");
const querystring = require("querystring");
// const request = require('request');
const crypto = require("crypto");
const MD5 = a => crypto.createHash("md5").update(a).digest("hex");

const defaultOpt = {
  //notLogin: new Set(),
  api: new Map(),
  timeout: 30000,
  port: 80,
  gzip: true,
  root: __dirname + "/root/",
  apiPrefix: "api/",
  http: null,
  hostname: null,
  sessionName: "PGTool",
  sessionLife: 1.5 * 60,
};

const session = new Map();
const format = (str, sep, eq, fn) =>
  typeof str !== "string"
    ? str
    : querystring.parse(str, sep || "&", eq || "=", {
        decodeURIComponent: fn || querystring.unescape,
      });
const URL = cb => {
  let index = cb.U.indexOf("?");
  cb.pathname = cb.U.substring(1, index < 0 ? undefined : index);

  cb.Q = index < 0 ? {} : querystring.parse(querystring.unescape(cb.U.substring(index + 1)));
};
// const A = function (url, obj) {
// 	const cb = this || null;
// 	//console.dir(cb);
// 	return new Promise((r, errFn) => {
// 		obj = obj || {};
// 		obj.method = obj.method || "post";
// 		const headers = {
// 			"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
// 			"Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
// 			'Referer': url,
// 			'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36"
// 		};
// 		obj.headers = obj.headers || {};
// 		for (let i in headers) {
// 			obj.headers[i] = obj.headers[i] || headers[i];
// 		}

// 		obj.timeout = obj.timeout || 10000;
// 		request(url, obj, (err, res, body) => {
// 			if (err) {
// 				cb && cb({ errMsg: "服务器繁忙" }, 500);
// 				errFn(err);
// 				return;
// 			}
// 			//console.log(res);
// 			r(body || res);
// 		});
// 	})
// };
const J = str => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
};
module.exports = opt => {
  opt = opt || {};
  const fn = function (apiObj = {}) {
    for (let i in apiObj) {
      fn.api.set(i, apiObj[i]);
    }

    if (!fn.http) {
      fn.http = require("https").createServer({
        cert: fs.readFileSync("crt.secret"),
        key: fs.readFileSync("key.secret"),
      });
      fn.http.listen(443);
    }
    fn.http.on("request", async (req, res) => {
      req.url = req.url.replace(/\/\//g, "/");
      //console.log(session)
      const cb = (data, code) => {
        if (cb.cookie.length) {
          res.setHeader("Set-Cookie", cb.cookie);
        }
        clearTimeout(cb.timer);
        code = code || cb.code || 200;
        if (code === 302) {
          res.writeHead(code, { Location: data });
          res.end("正在跳转");
          return;
        }

        if ((req.headers["accept-encoding"] || "").toLocaleLowerCase().indexOf("gzip") > -1) {
          zlib.gzip(JSON.stringify(data), (err, d) => {
            if (err) {
              res.writeHead(500);
              res.end(`{ "errMsg": "服务器压缩模块出错" }`);
              console.log(err);
              return;
            }
            res.setHeader("Content-Encoding", "gzip");
            res.writeHead(code);
            res.end(d);
          });
          return;
        }
        res.writeHead(code);
        res.end(JSON.stringify(data));
      };

      cb.req = req;
      cb.res = res;
      cb.U = decodeURIComponent(req.url) || "/";
      //console.log(cb.U)
      URL(cb);

      if (cb.U.substr(1, fn.apiPrefix.length) !== fn.apiPrefix) {
        const getFile = path =>
            new Promise(r =>
              fs.stat(path, (err, stats) => {
                if (!err && stats.isFile()) {
                  if (fn.gzip && (req.headers["accept-encoding"] || "").toLocaleLowerCase().indexOf("gzip") > -1) {
                    res.setHeader("Content-Encoding", "gzip");
                    fs.createReadStream(path).pipe(zlib.createGzip()).pipe(res);
                    r(1);
                    return;
                  }
                  fs.createReadStream(path).pipe(res);
                  r(stats.size);
                  return;
                }
                r(0);
              })
            ),
          path = fn.root + cb.pathname;
        if ((req.headers.accept || "").indexOf("html") > 0) {
          res.setHeader("Content-Type", "text/html; charset=UTF-8");
          if (!((await getFile(path)) || (await getFile(path + ".html")) || (await getFile(path + "/index.html")))) {
            res.writeHead(404);
            res.end("404");
          }
          return;
        }
        if (!(await getFile(path))) {
          res.writeHead(404);
          res.end("404");
        }
        return;
      }
      cb.api = cb.pathname.substr(fn.apiPrefix.length);
      if (!fn.api.has(cb.api)) {
        console.dir(cb);
        res.writeHead(404);
        res.end("404");
        return;
      }
      cb.H = new Proxy(req.headers || {}, {
        set(o, k, v) {
          res.setHeader(k, v);
        },
      });
      cb.F = format;
      cb.M = req.method.toLowerCase();
      cb.J = J;
      cb.B = "";
      cb.cookie = [];
      cb.code = 200;
      res.setHeader("Content-Type", "application/json;charset=utf-8");
      res.setHeader("ServerFrame", "pengge_tool-weui");
      switch (cb.M) {
        case "options":
          res.end("ok");
          return;
        case "post":
          cb.H.referer = cb.H.referer || cb.H.Referer || "";
          if (!cb.H.referer) {
            res.end("拒绝访问");
            return;
          }
          /*if (cb.H.referer.indexOf('https://' + clientHost) !== 0) {
						res.end('拒绝访问'); return;
					}*/
          await new Promise(r => {
            req.on("data", chunk => {
              cb.B += chunk;
            });
            req.on("end", () => {
              if (cb.B) {
                if (cb.H["content-type"].indexOf("urlencoded") > 0) {
                  cb.P = querystring.parse(querystring.unescape(cb.B)) || {};
                } else if (cb.H["content-type"].indexOf("json") > 0) {
                  cb.P = cb.J(cb.B);
                } else {
                  cb.P = cb.B;
                }
              } else {
                cb.P = {};
              }
              r();
            });
          });
          break;
      }

      cb.timer = setTimeout(() => cb({ errMsg: "请求超时" }, 504), fn.timeout);
      cb.C = new Proxy(format((cb.H.cookie || "").replace(/\s/g, ""), ";", "=", unescape), {
        set(o, k, v) {
          //res.setHeader('Set-Cookie', `${escape(k)}=${escape(v)} ; Path=/ ; secure`);
          cb.cookie.push(`${escape(k)}=${escape(v)} ; Path=/ `);
        },
      });
      cb.sessionKey = cb.C[fn.sessionName];
      cb.S = new Proxy(
        {},
        {
          get(o, k) {
            if (!cb.sessionKey || !session.has(cb.sessionKey)) {
              return null;
            }
            const sessionMap = session.get(cb.sessionKey),
              time = (new Date().getTime() / 1000) | 0;
            if ((time > sessionMap.get("sessionExpireTime")) | 0) {
              session.delete(cb.sessionKey);
              return null;
            }
            sessionMap.set("sessionExpireTime", time + fn.sessionLife);
            return sessionMap.get(k);
          },
          set(o, k, v) {
            if (!cb.sessionKey || !session.has(cb.sessionKey)) {
              //console.log(cb.sessionKey,session.has(cb.sessionKey));
              cb.sessionKey = MD5("MD5" + Math.random());
              session.set(cb.sessionKey, new Map());
              //res.setHeader('Set-Cookie', `${fn.sessionName}=${cb.sessionKey} ; Path=/${fn.apiPrefix} ; secure; HttpOnly`);
              cb.cookie.push(`${fn.sessionName}=${cb.sessionKey} ; Path=/${fn.apiPrefix} ;  HttpOnly`);
              //res.setHeader('Set-Cookie', );
            }
            const sessionMap = session.get(cb.sessionKey),
              time = (new Date().getTime() / 1000) | 0;
            sessionMap.set(k, v);
            sessionMap.set("sessionExpireTime", time + fn.sessionLife);
          },
        }
      );

      /*if (!notLog.has(cb.pathname)) {
				if (!cb.H['user-agent']) {
					cb(-3, {}, "拒绝访问");
					return;
				}
			}*/
      /*if (!fn.notLogin.has(cb.api)) {
				if (!cb.S.sessionExpireTime) {
					cb({ errMsg: "needLogin" }, 403);
					return;
				}
	
			};*/
      // cb.A = A.bind(cb);
      const reply = await fn.api.get(cb.api).call(cb, cb, req, res);
      if (reply === undefined) {
        return;
      }
      switch (typeof reply) {
        case "number":
          cb({ code: reply });
          return;
        case "object":
          cb(reply);
          return;
        case "string":
          cb({ errMsg: reply }, cb.code === 200 ? 403 : cb.code);
          return;
      }
      //console.log(reply);
    });
    //process.on('uncaughtException', err => console.log((new Date).toString() + "\n" + err + "\n\n"));
    return fn.http;
  };
  for (let i in defaultOpt) {
    fn[i] = opt[i] || defaultOpt[i];
  }
  //   fn.A = A;
  fn.G = (obj, ...opt) => {
    let o = obj;
    //console.log(obj, opt);
    for (var i = 0; i < opt.length; i++) {
      if (o[opt[i]] !== undefined) {
        o = o[opt[i]];
      } else {
        return "";
      }
    }
    return o;
  };
  //opt.notLoginArr && opt.notLoginArr.forEach(a => fn.notLogin.add(a));
  return fn;
};
