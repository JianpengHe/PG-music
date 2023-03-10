(function (file) {
  window.QQMusicLyricDecode = function (inputBuffer) {
    if (!(inputBuffer instanceof ArrayBuffer)) {
      throw new Error("inputBuffer must be ArrayBuffer!");
    }
    if (fn) {
      return fn(inputBuffer);
    }
    return new Promise(function (resolve) {
      queue.push({ cb: resolve, buf: inputBuffer });
    });
  };
  if (typeof window.inflate !== "function") {
    try {
      new DecompressionStream("deflate");
    } catch (e) {
      document.write(
        '<script src="https://tool.hejianpeng.cn/js/inflate.min.js"></scr' +
          "ipt>"
      );
    }
    window.inflate = function (arrayBuffer) {
      try {
        return new Response(
          new Response(arrayBuffer).body.pipeThrough(
            new DecompressionStream("deflate")
          )
        ).arrayBuffer();
      } catch (e) {
        return new Promise(function (resolve) {
          resolve(new Zlib.Inflate(arrayBuffer).decompress());
        });
      }
    };
  }
  var queue = [];
  var fn;
  window
    .inflate(
      Uint8Array.from(window.atob(file), function (c) {
        return c.charCodeAt(0);
      })
    )
    .then(function (buf) {
      return WebAssembly.instantiate(buf, {
        a: { a: function () {} },
      });
    })
    .then(function (res) {
      var wasmMemory = new Uint8Array(res.instance.exports.b.buffer),
        LyricDecode = res.instance.exports.d,
        malloc = res.instance.exports.e,
        free = res.instance.exports.f;
      fn = function (buf) {
        var strBuffer = new Uint8Array(buf);
        var strPointer = malloc(strBuffer.length + 1);
        wasmMemory.set(strBuffer, strPointer);
        wasmMemory[strPointer + strBuffer.length] = 0;
        var size = LyricDecode(strPointer, strBuffer.length);
        var decodeBuf = new Uint8Array(wasmMemory.buffer, strPointer, size);
        free(strPointer);
        return window.inflate(decodeBuf);
      };
      var queueData;
      while ((queueData = queue.splice(0, 1)[0])) {
        fn(queueData.buf).then(queueData.cb);
      }
    });
})(
  /** QQMusicLyricDecode.wasm.deflate */
  "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"
);
// require("fs").writeFileSync(
//   "1.txt",
//   require("fs")
//     .readFileSync("QQMusicLyricDecode.wasm.deflate")
//     .toString("base64")
// );
