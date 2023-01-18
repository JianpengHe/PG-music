//cls&rd /s /q build&node-gyp configure --arch=ia32&&node-gyp build&&node test
const { LyricDecode } = require(`./index`);
const zlib = require("zlib");
const fs = require("fs");

//console.log(String(zlib.inflateSync(Buffer.from("","hex"))));process.exit()
const text = String(fs.readFileSync("./lyric_test.txt")).trim();
const buf = Buffer.from(text, "hex");
const result = String(zlib.inflateSync(LyricDecode(buf, buf.length)));
console.log(result);
