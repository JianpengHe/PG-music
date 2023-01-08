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
  return (str) => {
    const out = [];
    let nowTime = 0;
    str
      .split("\n")
      .map((line) => line.trim().match(/^\[(\d+),(\d+)\](.*)$/))
      .filter((a) => a)
      .forEach(([, line_start, line_duration, line], line_index) => {
        /** 去掉歌词开头歌曲信息 */
        if (line_index < 10) {
          if (
            Number(line_duration) < 1000 ||
            /(词|曲|人|版|制|监)(.*?)(\:|：)/.test(line)
          ) {
            nowTime = 0;
            out.length = 0;
            return;
          }
        }
        /** 去掉空行 */
        if (!String(line).trim()) {
          return;
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
        }
        const start = Math.max(0, ch_duration_sum - Number(line_duration));
        nowTime += start;
        out.push({ start, nowTime, ch: "\n", end: 0 });
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
