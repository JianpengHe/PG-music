//cls&rd /s /q build&node-gyp configure --arch=ia32&&node-gyp build&&node test
const { LyricDecode } = require(`./QQMusicLyricDecode_node-v${
  process.version.match(/^v(\d{1,2})\./)[1]
}-win-x86.node`);
const zlib = require("zlib");
const fs = require("fs");

//console.log(String(zlib.inflateSync(Buffer.from("","hex"))));process.exit()
const text = String(fs.readFileSync("./lyric_test.txt")).trim();
const buf = Buffer.from(text, "hex");
console.log(String(zlib.inflateSync(LyricDecode(buf, buf.length))));
