const fs = require("fs");
const stream = require("stream");
const iconv = require("iconv-lite");
const readFlacFile = input =>
  new Promise(r => {
    if (input instanceof stream.Readable) {
      let buf = Buffer.allocUnsafe(0);
      const read = () => {
        input.once("data", chuck => {
          buf = Buffer.concat([buf, chuck]);
          if (buf.length >= 25) {
            input.unshift(buf);
            r(readFLACInfo(buf.subarray(0, 26)));
            return;
          }
          read();
        });
      };
      read();
    } else if (typeof input === "string") {
      const body = [];
      const readStream = fs.createReadStream(input, { start: 0, end: 26 });
      readStream.on("data", chuck => body.push(chuck));
      readStream.on("end", () => {
        r(readFLACInfo(Buffer.concat(body)));
      });
    } else {
      throw new Error("input must is stream.Readable or file name in your disk");
    }
  });
const readFLACInfo = buf => {
  if (!buf.subarray(0, 4).equals(Buffer.from("fLaC"))) {
    throw new Error("not flac file!");
  }
  const info = {
    /** 采样率 */
    sampleRate: buf[18] * 4096 + buf[19] * 16 + (buf[20] >> 4),
    /** 声道数 */
    channel: ((buf[20] >> 1) & 7) + 1, // 公式 byte.substring(m,n) --> byte>>(8-n)&(2**(n-m)-1)
    /** 位深（每个样本位数，常见：16位） */
    bitsPerSample: (buf[20] & 1) * 16 + (buf[21] >> 4) + 1, //取后n位：byte&(2**n-1) , 取前m位：byte>>m
    /** 总样本数 */
    totalSamples: (buf[21] & 15) * 4294967296 + buf[22] * 16777216 + buf[23] * 65536 + buf[24] * 256 + buf[25],
    /** 时长（秒） */
    duration: 0,
  };
  info.duration = info.totalSamples / info.sampleRate;
  return info;
};

(async () => {
  // const infoMap = new Map(
  //   JSON.parse(String(await fs.promises.readFile("save.json"))).map(d => ["F000" + d.media_mid + ".flac", d])
  // );
  const files = (await fs.promises.readdir("save/", { withFileTypes: true })).filter(
    a => !a.isDirectory() && /\.flac$/.test(a.name)
  );
  (await Promise.all(files.map(({ name }) => readFlacFile("save/" + name)))).forEach((info, i) => {
    const filename = files[i].name;
    const sp = filename.indexOf(" - ");
    files[i] = {
      ...info,
      filename,
      size: Math.ceil(info.duration),
      name: filename.substring(sp + 3, filename.length - 5),
      singer: filename.substring(0, sp),
    };
    if (info.sampleRate !== 44100 || info.channel !== 2 || info.bitsPerSample !== 16) {
      console.log(filename, "需要转码", info);
    }
  });

  files.sort((a, b) => b.size - a.size);
  //const total = arr.reduce((n, { size }) => n + size, 0);
  const maxSize = 4800;
  // 贪心算法
  const result = (arr => {
    const o = [];
    while (arr.length) {
      let nowTotal = arr[0].size;
      const set = [arr.splice(0, 1)[0]];
      let i = 0;
      while (nowTotal <= maxSize && i < arr.length) {
        if (arr[i].size + nowTotal <= maxSize) {
          nowTotal += arr[i].size;
          set.push(arr.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
      // console.log(nowTotal, set, [...arr]);
      o.push(set);
    }
    return o;
  })([...files]);

  for (let i = 0; i < result.length; i++) {
    const CDname = "CD " + String(i + 1).padStart(2, "0");
    console.log(CDname);
    const str =
      `TITLE "${CDname}"\nPERFORMER "${CDname}"\n` +
      result[i]
        .map(
          ({ name, singer, filename }, j) =>
            `FILE "${filename}" FLAC\n  TRACK ${String(j + 1).padStart(
              2,
              "0"
            )} AUDIO\n    TITLE "${name}"\n    PERFORMER "${singer}"\n    INDEX 01 00:00:00\n`
        )
        .join("");
    await fs.promises.writeFile("save/" + CDname + ".cue", iconv.encode(str, "gbk"));
  }

  // await Promise.all(result.map((_, i) => fs.promises.mkdir("save/CD" + (i + 1))));
  // for (let i = 0; i < result.length; i++) {
  //   console.log("CD" + (i + 1));
  //   await Promise.all(
  //     result[i].map(({ name }) => fs.promises.rename("save/" + name, "save/CD" + (i + 1) + "/" + name))
  //   );
  // }
})();
