(function (file) {
  var QQMusicLyric = (window.QQMusicLyric = function (audio) {
    this.audio = audio;
    this.onChar = function () {};
    // setInterval(() => {
    //   this.check();
    // }, 20);
  });
  QQMusicLyric.prototype.newLyric = function (lyricText, songTitle, delSongInfos) {
    if (typeof lyricText !== "string" || /[^\da-f]/i.test(lyricText)) {
      throw new Error("lyricText must be hex string!");
    }
    var that = this;
    return new Promise(function (resolve) {
      console.log(
        new Uint8Array(
          Array.from(lyricText.match(/[\da-f]{2}/gi) || []).map(function (c) {
            return parseInt(c, 16);
          })
        ).buffer
      );

      QQMusicLyricDecode(
        new Uint8Array(
          Array.from(lyricText.match(/[\da-f]{2}/gi) || []).map(function (c) {
            return parseInt(c, 16);
          })
        ).buffer
      ).then(function (buf) {
        console.log(new TextDecoder().decode(buf));
        that.lyric = [];
        var lyricLine = [{ start: 0, ch: "", nowTime: 0, end: 0 }];
        var nowTime = 0;
        var pushLine = function (end) {
          that.lyric.push({
            start: lyricLine[0].start,
            end: nowTime + end,
            chs: lyricLine,
          });
          lyricLine = [];
        };
        (songTitle
          ? [
              { start: 0, ch: songTitle, nowTime: 0, end: 0 },
              { start: 0, ch: "\n", nowTime: 0, end: 0 },
            ]
          : []
        )
          .concat(encode(new TextDecoder().decode(buf), delSongInfos))
          .forEach(function (out) {
            out.nowTime = nowTime += out.start;
            if (out.ch === "\n") {
              // out.end /= 2;
              // lyricLine.push({ start: out.start, nowTime: out.nowTime, ch: "\n", end: out.end});
              // out.start = 0;
              // out.nowTime += out.end;
              pushLine(0);
            } else {
              lyricLine.push({
                start: out.nowTime,
                ch: out.ch,
                duration: out.end,
              });
            }
            nowTime += out.end;
          });
        pushLine(Infinity);

        /** 单行过长分割 */
        (function (maxLen, lyric) {
          /** 先将含有空格的字分离 */
          for (var i = 0; i < lyric.length; i++) {
            var line = lyric[i];
            for (var j = maxLen - 1; j <= line.chs.length - maxLen; j++) {
              var char = line.chs[j];
              if (char.ch.includes(" ")) {
                var regRes = Array.from(char.ch.matchAll(/(\s*)(\S+)(\s*)/g));
                var chSplit = regRes
                  .map(function (res) {
                    return [res[1], res[2], res[3]];
                  })
                  .flat()
                  .filter(function (res) {
                    return res;
                  });
                /** 需要分割 */
                if (chSplit.length > 1) {
                  var start = char.start;
                  var chNum = regRes.length;
                  var duration = char.duration;
                  line.chs.splice.apply(
                    line.chs,
                    [j, 1].concat(
                      chSplit.map(function (ch) {
                        var nowCh = { start: start, ch: ch, duration: 0 };
                        if (!/^\s+$/.test(ch) && chNum) {
                          nowCh.duration = Math.floor(duration / chNum);
                          chNum--;
                          duration -= nowCh.duration;
                          start += nowCh.duration;
                        }
                        return nowCh;
                      })
                    )
                  );
                  j += chSplit.length - 1;
                }
              }
            }
          }
          /** duration为0时强制换行 */
          for (var i = 0; i < lyric.length; i++) {
            var line = lyric[i];
            for (var j = maxLen; j < line.chs.length - maxLen; j++) {
              var char = line.chs[j];
              if (/^\s+$/.test(char.ch) && char.duration === 0) {
                var nextChs = line.chs.splice(j).splice(1);
                lyric.splice(i + 1, 0, {
                  end: line.end,
                  start: (line.end = nextChs[0].start),
                  chs: nextChs,
                });
                // console.log(nextChs);
                break;
              }
            }
          }
        })(4, that.lyric);

        /** 平均行与行之间的时间（最多提前3秒出现下一行） */
        that.lyric.reduce(function (pre, now) {
          var interval = now.start - pre.end;
          console.log(interval);
          if (interval > 0) {
            /** 下一行要提前多少秒 */
            pre.end = now.start -= Math.min(3000, Math.floor(interval / 2));
          }
          return now;
        });

        /** 有songTitle时，第一句歌词提前3秒出现 */
        if (songTitle) {
          that.lyric[0].chs[1].start = that.lyric[0].end;
        } else {
          that.lyric[0].start = 0;
        }

        /** 加上index索引 */
        that.lyricFlat = that.lyric
          .map(function (line) {
            return line.chs;
          })
          .flat();
        that.lyricFlat.forEach(function (ch, i) {
          ch.index = i;
        });

        that.nowCh = that.lyricFlat[0];
        resolve(that.lyric);
        setTimeout(that.check);
      });
    });
  };
  QQMusicLyric.prototype.check = function () {
    if (!this.lyricFlat || !this.audio || !this.nowCh) {
      return false;
    }
    var currentTime = this.audio.currentTime * 1000;
    var nowCh = this.nowCh;
    var i = nowCh.index;

    if (nowCh.start > currentTime) {
      while (i > 0 && this.lyricFlat[i].start >= currentTime) {
        nowCh = this.lyricFlat[i];
        this.onChar("unplay", nowCh, 0);
        i--;
      }
    } else {
      while (i < this.lyricFlat.length && this.lyricFlat[i + 1].start <= currentTime) {
        nowCh = this.lyricFlat[i];
        this.onChar("played", nowCh, 0);
        i++;
      }
    }
    nowCh = this.lyricFlat[i];
    if (i !== this.nowCh.index) {
      console.log(i, this.nowCh.index);
      this.onChar("playing", nowCh, nowCh.start - this.audio.currentTime * 1000);
      //console.log(this.nowCh.ch, nowCh.ch);
    }
    this.nowCh = nowCh;
    return this.nowCh;
  };

  var QQMusicLyricDecode = function (inputBuffer) {
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
  var scriptDom;
  if (typeof window.inflate !== "function") {
    try {
      // throw new Error();
      new DecompressionStream("deflate");
    } catch (e) {
      scriptDom = document.createElement("script");
      scriptDom.src = "https://tool.hejianpeng.cn/js/inflate.min.js";
      document.body.appendChild(scriptDom);
    }
    window.inflate = function (arrayBuffer) {
      try {
        // throw new Error();
        return new Response(
          new Response(arrayBuffer).body.pipeThrough(new DecompressionStream("deflate"))
        ).arrayBuffer();
      } catch (e) {
        return new Promise(function (resolve) {
          resolve(new window.Zlib.Inflate(arrayBuffer).decompress());
        });
      }
    };
  }
  var queue = [];
  var fn;
  var initFn = function () {
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
  };
  if (scriptDom) {
    scriptDom.onload = initFn;
  } else {
    initFn();
  }
  const encode = (() => {
    const banHeadInfoKeyWord = [
      ..."abcdefghijklmnopqrstuvwxyz词曲人版制监编唱手号",
      "母带",
      "出品",
      "导演",
      "舞台",
      "舞团",
      "吉他",
      "合音",
      "公司",
      "弦乐",
      "混音",
      "音乐",
      "统筹",
      "鸣谢",
      "秀导",
      "特别",
    ];
    const checkNowTime = out => {
      let nowRealTime = 0;
      let useCheck = false;
      return out.every(({ start, nowTime, end, ch }, i) => {
        if (start < 0 || end < 0) {
          console.log(out[i]);
          return false;
        }
        nowRealTime += start;
        if (i === out.length - 1) {
          useCheck === true;
        }
        if (useCheck && nowRealTime !== nowTime) {
          console.log(out.slice(i - 1, i + 2), "nowRealTime", nowRealTime, "nowTime", nowTime);
          return false;
        }
        useCheck = false;
        // out[i].RealTime = nowRealTime === nowTime;
        nowRealTime += end;
        // if (ch === "\n") {
        //   useCheck = true;
        // }
        return true;
      });
    };
    const fix = (bug_item, fix_item, pos) => {
      let jian = 0;
      if (bug_item[pos] >= 0) {
        return true;
      }
      if (fix_item.end > 0) {
        jian = Math.min(
          //fix_item.end - (fix_item.ch.trim() ? 10 : 0),
          fix_item.end,
          -bug_item[pos]
        );
        fix_item.end -= jian;
        bug_item[pos] += jian;
        // bug_item.nowTime -= jian;
        if (bug_item[pos] >= 0) {
          return true;
        }
      }
      if (fix_item.start > 0) {
        jian = Math.min(fix_item.start, -bug_item[pos]);
        fix_item.start -= jian;
        bug_item[pos] += jian;
        bug_item.nowTime -= jian;
        if (bug_item[pos] >= 0) {
          return true;
        }
      }
      return false;
    };

    /** delSongInfos传false则不【去掉歌词开头歌曲信息】 */
    return (str, delSongInfos) => {
      const out = [];
      let nowTime = 0;

      if (delSongInfos !== false) {
        if (!Array.isArray(delSongInfos)) {
          delSongInfos = [];
        }
        /** 歌曲名 */
        // delSongInfos.push((str.match(/\[ti:(.+?)\]/) || [])[1] || "");
        /** 歌手 */
        delSongInfos.push((str.match(/\[ar:(.+?)\]/) || [])[1] || "");
        delSongInfos = [...new Set(delSongInfos.map(a => a.trim()).filter(a => a))];

        // console.log(delSongInfos);
      }
      const delSongInfoRegs = (delSongInfos || []).map(
        a =>
          new RegExp(
            `[\\x00-\\xff]+?[（\\(]{0,1}${[...a]
              .map(a => ("*.?+$^[](){}|/".includes(a) ? "\\\\" : "") + a)
              .join("")}[）\\)]{0,1}[\\x00-\\xff]+?`,
            "i"
          )
      );

      /** 上一行是否存在冒号 */
      let lastLinehasColon = true;

      str
        /** 去掉空字符 */
        .replace(/(\[\d+,\d+\])\(\d+,\d+\)/g, (_, a) => a)
        .replace(/(\(\d+,\d+\))\(\d+,\d+\)/g, (_, a) => a)

        .split("\n")
        .map(line => line.trim().match(/^\[(\d+),(\d+)\](.*)$/))
        .filter(a => a)
        .forEach(([, line_start, line_duration, line], line_index) => {
          let lineStr = " ";
          /** 去掉歌词开头歌曲信息 */
          if (delSongInfos) {
            /** 去掉空行 */
            if (!String(line).trim()) {
              return;
            }
            // console.log(lastLinehasColon, line_index, line);
          }

          let ch_duration_sum = 0;
          if (out.length) {
            out[out.length - 1].end = -nowTime + (nowTime = Number(line_start));
          }
          for (const [, ch, ch_start, ch_duration] of line.matchAll(/(.+?)\((\d+),(\d+)\)/g)) {
            out.push({
              start: -nowTime + (nowTime = Number(ch_start)),
              nowTime,
              ch: String(ch).replace(/[\ue000-\uf8ff]/g, " "),
              end: Number(ch_duration),
            });
            nowTime += Number(ch_duration);
            ch_duration_sum += Number(ch_duration);
            lineStr += ch.trim();
          }
          const start = Math.max(0, ch_duration_sum - Number(line_duration));
          nowTime += start;
          out.push({ start, nowTime, ch: "\n", end: 0 });

          /** 去掉歌词开头歌曲信息 */
          if (delSongInfos) {
            lineStr += " ";
            lineStr = lineStr.replace(/\:/g, "：").toLowerCase();
            let isDelThisLine = false;
            let split;

            // console.log(lineStr);

            if (
              line_index < 30 &&
              /** 上一行必须有冒号 */
              lastLinehasColon &&
              /** 至少有一个冒号 */
              (split = lineStr.split("：")).length >= 2 &&
              /** 不能包含歌曲信息 */
              delSongInfos.every(info => !split[0].includes(info.toLowerCase())) &&
              /** 有关键字就ban */
              banHeadInfoKeyWord.some(kw => split[0].includes(kw))
            ) {
              isDelThisLine = true;
            } else if (
              line_index < 10 &&
              ((lineStr.length > 5 && Number(line_duration) < 500) || delSongInfoRegs.some(reg => reg.test(lineStr)))
            ) {
              isDelThisLine = true;
            }
            if (isDelThisLine) {
              nowTime = 0;
              out.length = 0;
            }
            lastLinehasColon = line_index < 1 || lineStr.includes("：");
          }
        });
      out.splice(-1, 1);
      /** 修复负数 */
      /** 上一行\n的索引 */
      let lastLineIndex = -1;
      out.forEach((item, i) => {
        let index = i;
        if (item.end < 0 || item.start < 0) {
          while (1) {
            if (fix(item, out[index--], "end") && fix(item, out[index], "start")) {
              break;
            }
            // if (index <= lastLineIndex) {
            //   console.log(str, out.slice(index - 1, i + 2));
            //   throw new Error("修复修到上一行了！！！");
            // }
          }
        }
        if (item.ch === "\n") {
          lastLineIndex = i;
        }
      });

      if (!checkNowTime(out)) {
        console.log(str, out);
        throw new Error("checkNowTime 出错");
      }
      // console.log(out);
      //out.forEach((a) => console.log(a));
      return out;

      //console.log(out);
    };
  })();
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
