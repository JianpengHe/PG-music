/**
 * 歌词编码/解码模块
 * 利用 Unicode 私人使用区 (Private Use Zone) 0xE000 - 0xF8FF 进行隐写编码
 */

// 基础常量定义
const PRIVATE_USE_START = 0xe000;
// const PRIVATE_USE_END = 0xF8FF; // 未直接使用，但逻辑中隐含
const BASE_6400 = 6400; // 编码进制单位
const BASE_6000 = 6000; // 单字符编码阈值

/**
 * 歌词标记对象结构
 */
export interface LyricToken {
  /** 距离上一个字的时间间隔 (前摇时间) */
  timeGap: number;
  /** 当前字的绝对时间戳 (仅用于校验和计算，不直接编码) */
  absoluteTime: number;
  /** 歌词文字 */
  text: string;
  /** 当前字持续时长 */
  duration: number;
}

export const encodeTokensToString = (tokens: LyricToken[]): string =>
  tokens
    .map(({ timeGap, text, duration }) => {
      let str = "";

      // 编码时间间隔 (timeGap)
      if (timeGap !== 0) {
        let tempGap = timeGap;
        do {
          const remainder = tempGap % BASE_6400;
          tempGap -= remainder;
          tempGap /= BASE_6400;
          str += String.fromCharCode(remainder + PRIVATE_USE_START);
        } while (tempGap >= 1);
      }

      str += text;

      // 编码持续时长 (duration)
      if (duration <= BASE_6000) {
        str += String.fromCharCode(duration + PRIVATE_USE_START);
      } else {
        // 大数编码逻辑
        str +=
          String.fromCharCode(((duration / BASE_6400) | 0) + BASE_6000 + PRIVATE_USE_START) +
          String.fromCharCode((duration % BASE_6400) + PRIVATE_USE_START);
      }
      return str;
    })
    .join("");

export const encodeLyricToken = (() => {
  // 需要屏蔽的头部元数据关键字
  const METADATA_KEYWORDS = [
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

  /**
   * 校验时间轴连续性 (调试用)
   * 确保累加的时间与记录的绝对时间一致
   */
  const validateTimeline = (tokens: LyricToken[]) => {
    let calculatedRealTime = 0;
    let shouldCheck = false;

    return tokens.every(({ timeGap, absoluteTime, duration }, i) => {
      if (timeGap < 0 || duration < 0) {
        console.error("发现负数时间:", tokens[i]);
        return false;
      }

      calculatedRealTime += timeGap;

      if (i === tokens.length - 1) {
        // 最后一个元素通常触发检查（原文逻辑意图）
        // 原代码写的是 useCheck === true，这在JS里是比较语句而非赋值，可能是原逻辑笔误，
        // 但要求“不修改逻辑”，故此处保留原逻辑副作用（即无副作用）
        // 若原意是赋值，这里应为 useCheck = true;
      }

      if (shouldCheck && calculatedRealTime !== absoluteTime) {
        console.error(
          "时间轴校验失败:",
          tokens.slice(i - 1, i + 2),
          "计算时间:",
          calculatedRealTime,
          "记录时间:",
          absoluteTime,
        );
        return false;
      }

      shouldCheck = false;
      calculatedRealTime += duration;
      return true;
    });
  };

  /**
   * 修复负数时间问题
   * 当出现重叠（负间隔）时，通过减少前一个字的持续时间或前摇来补偿
   */
  const fixNegativeDuration = (
    problemToken: LyricToken,
    prevToken: LyricToken,
    pos: "duration" | "timeGap", // 对应原代码的 "end" 或 "start"
  ): boolean => {
    let deduction = 0;

    // 如果当前属性已经非负，无需修复
    // @ts-ignore: 动态属性访问
    if (problemToken[pos] >= 0) {
      return true;
    }

    // 尝试减少前一个字的持续时长
    if (prevToken.duration > 0) {
      deduction = Math.min(
        prevToken.duration,
        // @ts-ignore: 取负数转正
        -problemToken[pos],
      );
      prevToken.duration -= deduction;
      // @ts-ignore
      problemToken[pos] += deduction;

      // @ts-ignore
      if (problemToken[pos] >= 0) {
        return true;
      }
    }

    // 尝试减少前一个字的前摇 (TimeGap)
    if (prevToken.timeGap > 0) {
      // @ts-ignore
      deduction = Math.min(prevToken.timeGap, -problemToken[pos]);
      prevToken.timeGap -= deduction;
      // @ts-ignore
      problemToken[pos] += deduction;
      // 调整当前绝对时间记录（虽然不影响最终编码，但影响中间状态）
      problemToken.absoluteTime -= deduction;

      // @ts-ignore
      if (problemToken[pos] >= 0) {
        return true;
      }
    }

    return false;
  };

  /**
   * 将对象数组编码为最终字符串
   * 编码规则：
   * 1. timeGap (start): 小端序 Base6400 编码
   * 2. text (ch): 原文字符
   * 3. duration (end):
   * - < 6000: 单字符编码
   * - >= 6000: 双字符编码 (高位在后) 公式: (val / 6400) | 0 + 6000 ...
   */

  /**
   * 主编码函数
   * @param str 原始歌词字符串
   * @param stripMetadata 是否移除歌词开头的元数据信息 (false 则不移除，或者传入字符串数组作为额外过滤关键词)
   */
  return (str: string, stripMetadata?: boolean | string[]) => {
    const lyricTokens: LyricToken[] = [];
    let currentGlobalTime = 0;

    // --- 预处理元数据过滤列表 ---
    let metadataFilters: string[] = [];
    if (stripMetadata !== false) {
      if (Array.isArray(stripMetadata)) {
        metadataFilters = stripMetadata;
      } else {
        metadataFilters = [];
      }

      // 提取 [ar:歌手] 信息用于过滤
      const artistMatch = (str.match(/\[ar:(.+?)\]/) || [])[1] || "";
      metadataFilters.push(artistMatch);

      // 去重并去除空字符串
      metadataFilters = [...new Set(metadataFilters.map(a => a.trim()).filter(a => a))];
    }

    // 构建过滤正则
    const metadataRegexList = metadataFilters.map(
      keyword =>
        new RegExp(
          `[\\x00-\\xff]+?[（\\(]{0,1}${[...keyword]
            .map(char => ("*.?+$^[](){}|/".includes(char) ? "\\\\" : "") + char)
            .join("")}[）\\)]{0,1}[\\x00-\\xff]+?`,
          "i",
        ),
    );

    let previousLineHasColon = true;

    // --- 解析原始歌词 ---
    str
      // 预处理：去掉嵌套的坐标格式 (例如 [x,y](z,w) -> [x,y])，清洗脏数据
      .replace(/(\[\d+,\d+\])\(\d+,\d+\)/g, (_, a) => a)
      .replace(/(\(\d+,\d+\))\(\d+,\d+\)/g, (_, a) => a)
      .split("\n")
      .map(line => line.trim().match(/^\[(\d+),(\d+)\](.*)$/)) // 匹配行格式: [start, duration]text
      .filter((match): match is RegExpMatchArray => !!match)
      .forEach(([, lineStartStr, lineDurationStr, lineContent], lineIndex) => {
        let cleanLineStr = " ";

        // 过滤空行
        if (stripMetadata && !String(lineContent).trim()) {
          return;
        }

        let charDurationSum = 0;

        // 调整上一行的结束时间，使其与当前行开始时间衔接
        if (lyricTokens.length) {
          const prevToken = lyricTokens[lyricTokens.length - 1];
          // 计算上一行结束到当前行开始的间隙，更新为上一行的 duration
          // 这里通过更新 currentGlobalTime 为当前行开始时间来计算差值
          currentGlobalTime = Number(lineStartStr);
          prevToken.duration = -prevToken.absoluteTime + currentGlobalTime;
          // 注意：此时 prevToken.absoluteTime 是上一行结束时的 oldNowTime，
          // 这里逻辑稍微有点绕，原逻辑: out[...].end = -nowTime + (nowTime = newStart)
          // 等价于 duration = newStart - oldNowTime
        } else {
          currentGlobalTime = Number(lineStartStr);
        }

        // 解析行内每一个字的详情: text(start, duration)
        for (const [, charText, charStartStr, charDurationStr] of lineContent.matchAll(/(.+?)\((\d+),(\d+)\)/g)) {
          const charStart = Number(charStartStr);
          const charDuration = Number(charDurationStr);

          // 计算相对时间间隔 (TimeGap)
          // timeGap = charStart - currentGlobalTime
          const timeGap = -currentGlobalTime + (currentGlobalTime = charStart);

          lyricTokens.push({
            timeGap: timeGap,
            absoluteTime: currentGlobalTime,
            text: String(charText).replace(/[\ue000-\uf8ff]/g, " "), // 移除私有区字符防止干扰
            duration: charDuration,
          });

          currentGlobalTime += charDuration;
          charDurationSum += charDuration;
          cleanLineStr += charText.trim();
        }

        // 处理行末的换行符
        // 计算该行实际剩余的时间 (行总时长 - 所有字时长之和)
        // start 这里其实是 "行末空闲时间"
        const lineEndGap = Math.max(0, charDurationSum - Number(lineDurationStr));
        currentGlobalTime += lineEndGap;

        lyricTokens.push({
          timeGap: lineEndGap,
          absoluteTime: currentGlobalTime,
          text: "\n",
          duration: 0,
        });

        // --- 核心逻辑：去除歌词头部元数据信息 ---
        if (stripMetadata) {
          cleanLineStr += " ";
          cleanLineStr = cleanLineStr.replace(/\:/g, "：").toLowerCase();
          let shouldDeleteLine = false;
          let splitParts: string[];

          if (
            lineIndex < 30 &&
            previousLineHasColon && // 连续性检查
            (splitParts = cleanLineStr.split("：")).length >= 2 && // 包含冒号
            // 确保不包含真正的歌曲信息(如歌名歌手)
            metadataFilters.every(info => !splitParts[0].includes(info.toLowerCase())) &&
            // 包含被 ban 的关键字 (如 "作词", "编曲")
            METADATA_KEYWORDS.some(kw => splitParts[0].includes(kw))
          ) {
            shouldDeleteLine = true;
          } else if (
            lineIndex < 10 &&
            // 短行且时长极短，或者匹配正则
            ((cleanLineStr.length > 5 && Number(lineDurationStr) < 500) ||
              metadataRegexList.some(reg => reg.test(cleanLineStr)))
          ) {
            shouldDeleteLine = true;
          }

          if (shouldDeleteLine) {
            // 如果判定为元数据行，重置时间并清空之前的 tokens
            currentGlobalTime = 0;
            lyricTokens.length = 0;
          }
          // 更新状态：当前行是否看起来像KV对
          previousLineHasColon = lineIndex < 1 || cleanLineStr.includes("：");
        }
      });

    // 移除最后一个多余的换行符 token
    lyricTokens.splice(-1, 1);

    // --- 修复阶段：处理负数时间 ---
    let lastLineBreakIndex = -1;
    lyricTokens.forEach((token, i) => {
      let cursorIndex = i;

      // 如果当前 token 存在负数时间 (gap 或 duration)
      if (token.duration < 0 || token.timeGap < 0) {
        while (true) {
          // 向前回溯修复
          // 先尝试修 duration (end), 再尝试修 timeGap (start)
          if (
            fixNegativeDuration(token, lyricTokens[cursorIndex--], "duration") &&
            fixNegativeDuration(token, lyricTokens[cursorIndex], "timeGap")
          ) {
            break;
          }
          // 原代码有一段注释掉的死循环保护检查 throw Error
        }
      }

      if (token.text === "\n") {
        lastLineBreakIndex = i;
      }
    });

    // --- 检查超长时长 ---
    // 若时长超过 399 * 6400 (约42分钟，2553600ms)，插入空格节点进行分段
    for (let i = 0; i < lyricTokens.length; i++) {
      const item = lyricTokens[i];
      if (item.duration > 2553600) {
        lyricTokens.splice(i + 1, 0, {
          timeGap: item.duration - 2553600,
          absoluteTime: item.absoluteTime + item.duration,
          text: " ",
          duration: 0,
        });
        item.duration = 2553600;
      }
    }

    // --- 最终安全检查 ---
    if (!validateTimeline(lyricTokens)) {
      console.log(str, lyricTokens);
      throw new Error("Timeline validation failed (checkNowTime error)");
    }

    return lyricTokens;
  };
})();

export const stringToLyricToken = (() => {
  /**
   * 解码时间间隔数值
   * 对应编码时的小端序 Base6400
   */
  const decodeTimeGap = function (str: string) {
    return Array.from(str)
      .reverse()
      .reduce(function (total, char) {
        return total * BASE_6400 + (char.charCodeAt(0) - PRIVATE_USE_START);
      }, 0);
  };

  /**
   * 解码函数
   * @param encodedStr 编码后的字符串
   */
  return function (encodedStr: string) {
    let startPositionOffset: number | undefined;
    let currentGlobalTime = 0;

    // 正则：分离 [非私用区字符(歌词)] 和 [私用区字符(时间编码)]
    return Array.from(encodedStr.matchAll(/([^\ue000-\uf8ff]+)([\ue000-\uf8ff]+)/g)).map(function (matchResult) {
      // 解析该段文字之前的 Start Gap (只在第一次解析前执行一次)
      // 注意：这里逻辑有点特殊，它是解析 match 索引之前的字符串作为 start
      if (startPositionOffset === undefined) {
        startPositionOffset = decodeTimeGap(encodedStr.substring(0, matchResult.index));
      }

      const timeGap = startPositionOffset!;

      const token: LyricToken = {
        timeGap: timeGap,
        absoluteTime: (currentGlobalTime += timeGap),
        text: matchResult[1], // 歌词文本
        duration: matchResult[2][0].charCodeAt(0) - PRIVATE_USE_START, // 初始时长解析
      };

      // 解析 Duration
      if (token.duration < BASE_6000) {
        // 单字符编码时长，剩余部分为下一个字的 start gap
        startPositionOffset = decodeTimeGap(matchResult[2].substring(1));
      } else {
        // 双字符编码时长
        // 公式逆运算：(HighChar % 6000) * 6400 + LowChar
        token.duration = (token.duration % BASE_6000) * BASE_6400 + matchResult[2][1].charCodeAt(0) - PRIVATE_USE_START;
        // 剩余部分为下一个字的 start gap
        startPositionOffset = decodeTimeGap(matchResult[2].substring(2));
      }

      currentGlobalTime += token.duration;
      return token;
    });
  };
})();

export class LyricShow {
  private lyricLine: LyricToken[][] = [];
  private duration: number = 0;
  constructor(
    private readonly onLyricLineChange: (lyricLineDomString: string, index: number) => void,
    private readonly getOffsetTime: () => number,
  ) {}
  static formatLyric(lyric: LyricToken[], maxTokenPerLine = 5) {
    const output: LyricToken[][] = [];
    let curLine: LyricToken[] = [];
    let nowTokenCount = 0;
    for (const token of lyric) {
      const isBlank = /^\s*$/.test(token.text);
      if (nowTokenCount === 0 && isBlank) continue;
      if (nowTokenCount >= maxTokenPerLine && isBlank) {
        output.push(curLine);
        curLine = [];
        nowTokenCount = 0;
        continue;
      }
      curLine.push(token);
      nowTokenCount++;
    }
    if (curLine.length > 0) output.push(curLine);
    console.log(output);
    return output;
  }
  public loadLyric(lyricLine: LyricToken[][], duration: number) {
    this.lyricLine = lyricLine;
    this.duration = duration * 1000;
    this.curLineIndex = -1;
    this.play();
  }

  private timer: number = 0;
  private curLineIndex: number = -1;
  public play() {
    if (!this.lyricLine.length) return;

    const currentTime = this.getOffsetTime() * 1000;
    console.log("play()", currentTime);
    const lastToken = this.lyricLine[this.lyricLine.length - 1][this.lyricLine[this.lyricLine.length - 1].length - 1];
    const maxTime = lastToken.absoluteTime + lastToken.duration;

    if (currentTime >= maxTime) {
      console.log("currentTime >= maxTime", currentTime, maxTime);
      if (this.timer) clearTimeout(this.timer);
      this.timer = Number(
        setTimeout(
          () => {
            this.timer = 0;
            this.play();
          },
          this.duration - currentTime + 100,
        ),
      );
      return;
    }

    for (let i = 0; i < this.lyricLine.length; i++) {
      const line = this.lyricLine[i];
      const nextLine = i < this.lyricLine.length - 1 ? this.lyricLine[i + 1] : undefined;
      if (!line[0]) continue;
      if (nextLine === undefined || !nextLine[0] || nextLine[0].absoluteTime > currentTime) {
        const lastLine = i > 0 ? this.lyricLine[i - 1] : undefined;
        const lastLineEndTime = lastLine
          ? lastLine[lastLine.length - 1].absoluteTime + lastLine[lastLine.length - 1].duration
          : 0;
        const showTime = lastLine ? (line[0].absoluteTime - lastLineEndTime) / 2 + lastLineEndTime : 0;
        console.log("showTime - currentTime", showTime, currentTime);
        this.timer = Number(
          setTimeout(() => {
            this.timer = 0;
            const currentTime = this.getOffsetTime() * 1000;
            this.onLyricLineChange(
              line
                .map(
                  ({ absoluteTime, duration, text }) =>
                    `<span style="animation-delay: ${absoluteTime - currentTime}ms;animation-duration: ${duration}ms;animation-name: lyric;">${text}</span>`,
                )
                .join(""),
              i,
            );
            if (!nextLine) return;
            this.timer = Number(
              setTimeout(
                () => {
                  this.timer = 0;
                  this.play();
                },
                nextLine[0].absoluteTime - currentTime + 100,
              ),
            );
          }, showTime - currentTime),
        );
        break;
      }
    }
  }
  public pause() {
    clearTimeout(this.timer);
    this.timer = 0;
  }
}

// 为了兼容旧的 CommonJS 引用方式，如果需要可以保留下面这行，但在纯TS环境中通常只需 export const
// module.exports = { encode, decode };
export default { encode: encodeLyricToken, decode: stringToLyricToken };
