const https = require("https");
const fs = require("fs");
const server = `https://${String(fs.readFileSync("../secret/serverHost.secret"))}:${String(
  fs.readFileSync("../secret/serverPort.secret")
)}/getPlayUrl`;

const get = url =>
  new Promise(r =>
    https.get(url, { rejectUnauthorized: false }, res => {
      const body = [];
      res.on("data", c => body.push(c));
      res.on("end", () => r(JSON.parse(String(Buffer.concat(body)))));
    })
  );
(async () => {
  const save = JSON.parse(String(await fs.promises.readFile("save.json")));
  console.log(save.length);
  let split = [];
  while ((split = save.splice(0, 10)).length) {
    for (const { filename, purl } of (
      await get(
        `${server}?${split
          .map(
            ({ media_mid, mid }) =>
              `filename=M800${media_mid}.mp3&songmid=${mid}&filename=F000${media_mid}.flac&songmid=${mid}`
          )
          .join("&")}`
      )
    ).filter(({ filename, purl }) => filename && purl)) {
      await new Promise(r => {
        console.log(filename);
        const f = fs.createWriteStream("save/" + filename);
        https.get(
          "https://dl.stream.qqmusic.qq.com/" + purl,
          {
            rejectUnauthorized: false,
          },
          res => {
            res.pipe(f);
            f.once("close", r);
          }
        );
      });
    }
  }
})();
