const fs = require("fs");
const zlib = require("zlib");
const os = require("os");
const file = `QQMusicLyricDecode_node-v${process.version.match(/^v(\d{1,2})\./)[1]}-${process.platform}-${
  process.arch
}.node`;
const temp = `${os.tmpdir()}/${file}`;

try {
  module.exports = require(temp);
} catch (e) {
  console.log("解压", file);
  fs.writeFileSync(temp, zlib.brotliDecompressSync(fs.readFileSync(__dirname + "/" + file + ".brotli")));
  module.exports = require(temp);
}

// fs.readdirSync("./")
//   .filter(name => /\.node$/.test(name))
//   .forEach(name => fs.writeFileSync(name + ".brotli", zlib.brotliCompressSync(fs.readFileSync(name))));

//const { LyricDecode } = require(`./index`);
