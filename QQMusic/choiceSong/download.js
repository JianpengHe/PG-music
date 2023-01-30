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
const getFileName = ({ name, singer }) => `${singer} - ${name}`;
(async () => {
  const fileList = new Set(fs.readdirSync("save"));
  const infoMap = new Map(JSON.parse(String(await fs.promises.readFile("save.json"))).map(d => [d.mid, d]));
  // await Promise.all(
  //   [...infoMap.values()]
  //     .map(a => [
  //       { from: `M800${a.media_mid}.mp3`, to: `${getFileName(a)}.mp3` },
  //       { from: `F000${a.media_mid}.flac`, to: `${getFileName(a)}.flac` },
  //     ])
  //     .flat()
  //     .filter(({ from }) => fileList.has(from))
  //     .map(({ from, to }) => fs.promises.rename("save/" + from, "save/" + to))
  // );
  const save = JSON.parse(String(await fs.promises.readFile("save.json"))).filter(
    a => !fileList.has(`${getFileName(a)}.mp3`) || !fileList.has(`${getFileName(a)}.flac`)
  );
  console.log(save.length);
  let split = [];
  while ((split = save.splice(0, 10)).length) {
    split.forEach(({ name, singer, media_mid }) => console.log(singer + " - " + name + " " + media_mid));
    for (const { filename, purl, songmid } of (
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
        console.log(songmid);
        const f = fs.createWriteStream(
          "save/" + getFileName(infoMap.get(songmid)) + filename.substring(filename.lastIndexOf("."))
        );
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
