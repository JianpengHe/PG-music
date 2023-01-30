const http = require("http");
const fs = require("fs");
const root = __dirname + "/";
http
  .createServer((req, res) => {
    const { pathname } = new URL("http://127.0.0.1" + req.url);
    if (pathname.includes("./")) {
      res.statusCode = 403;
      res.end("403");
      return;
    }
    const path = root + decodeURIComponent(pathname);
    if (req.method === "GET") {
      fs.createReadStream(path)
        .once("error", () => {
          res.statusCode = 404;
          res.end();
        })
        .pipe(res);
      return;
    }
    res.end("404");
  })
  .listen(80);
