//0xE000	0xF8FF 自行使用區域	Private Use Zone
/**
 * 每个字编码规则:
 * [距离上一个字的时间:number1] [歌词文字:string] [时长:number2]
 *
 * number编码规则：使用0xE000-0xF8FF，减去0xE000后为真实值
 * number1编码规则：使用无限制的字符编码，所有连续的0xE000-0xF8FF都编码同一个数字，使用小端编码(若使用0个字符编码，则代表数字0)
 * number2编码规则：第一个字符小于6000，只使用一个字符编码该数字，即该字符代表真实数字；若6000-6399，则使用2个字符编码该字符，公式：(第一个字符%6000)*6400+第二个字符
 * 若number2大于399*6400，会添加一个空格字符，将多余的时间计入这个空格字符
 */

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
  const checkNowTime = (out) => {
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
        console.log(
          out.slice(i - 1, i + 2),
          "nowRealTime",
          nowRealTime,
          "nowTime",
          nowTime
        );
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
  const encodeNumber = (out) =>
    out
      .map(({ start, ch, end }) => {
        let str = "";
        if (start !== 0) {
          do {
            const n = start % 6400;
            start -= n;
            start /= 6400;
            str += String.fromCharCode(n + 0xe000);
          } while (start >= 1);
        }
        str += ch;
        if (end <= 6000) {
          str += String.fromCharCode(end + 0xe000);
        } else {
          str +=
            String.fromCharCode(((end / 6400) | 0) + 6000 + 0xe000) +
            String.fromCharCode((end % 6400) + 0xe000);
        }
        return str;
      })
      .join("");

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
      delSongInfos = [
        ...new Set(delSongInfos.map((a) => a.trim()).filter((a) => a)),
      ];

      // console.log(delSongInfos);
    }
    const delSongInfoRegs = (delSongInfos || []).map(
      (a) =>
        new RegExp(
          `[\\x00-\\xff]+?[（\\(]{0,1}${[...a]
            .map((a) => ("*.?+$^[](){}|/".includes(a) ? "\\\\" : "") + a)
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
      .map((line) => line.trim().match(/^\[(\d+),(\d+)\](.*)$/))
      .filter((a) => a)
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
        for (const [, ch, ch_start, ch_duration] of line.matchAll(
          /(.+?)\((\d+),(\d+)\)/g
        )) {
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
            delSongInfos.every(
              (info) => !split[0].includes(info.toLowerCase())
            ) &&
            /** 有关键字就ban */
            banHeadInfoKeyWord.some((kw) => split[0].includes(kw))
          ) {
            isDelThisLine = true;
          } else if (
            line_index < 10 &&
            ((lineStr.length > 5 && Number(line_duration) < 500) ||
              delSongInfoRegs.some((reg) => reg.test(lineStr)))
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
          if (
            fix(item, out[index--], "end") &&
            fix(item, out[index], "start")
          ) {
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
    /** 检查是否大于399*6400 */
    for (let i = 0; i < out.length; i++) {
      const item = out[i];
      if (item.end > 2553600) {
        out.splice(i + 1, 0, {
          start: item.end - 2553600,
          nowTime: item.nowTime + item.end,
          ch: " ",
          end: 0,
        });
        item.end = 2553600;
      }
    }

    if (!checkNowTime(out)) {
      console.log(str, out);
      throw new Error("checkNowTime 出错");
    }
    // console.log(out);
    //out.forEach((a) => console.log(a));
    return encodeNumber(out);

    //console.log(out);
  };
})();

const decode = (() => {
  const readStartNumber = function (str) {
    return Array.from(str)
      .reverse()
      .reduce(function (n, ch) {
        return n * 6400 + (ch.charCodeAt(0) - 0xe000);
      }, 0);
  };
  return function (enc) {
    var start_pos;
    var nowTime = 0;
    return Array.from(
      enc.matchAll(/([^\ue000-\uf8ff]+)([\ue000-\uf8ff]+)/g)
    ).map(function (res) {
      if (start_pos === undefined) {
        start_pos = readStartNumber(enc.substring(0, res.index));
      }
      var obj = {
        start: start_pos,
        nowTime: (nowTime += start_pos),
        ch: res[1],
        end: res[2][0].charCodeAt(0) - 0xe000,
      };
      if (obj.end < 6000) {
        start_pos = readStartNumber(res[2].substring(1));
      } else {
        obj.end = (obj.end % 6000) * 6400 + res[2][1].charCodeAt(0) - 0xe000;
        start_pos = readStartNumber(res[2].substring(2));
      }
      nowTime += obj.end;
      return obj;
    });
  };
})();

module.exports = { encode, decode };
// console.log(
//   Buffer.from(String.fromCharCode(0xe000)),
//   Buffer.from(String.fromCharCode(0xf8ff)),
//   Buffer.from("发")
// );
