const https = require("https");

const singerList = new Set([
  "BEYOND",
  "侧田",
  "关正杰",
  "关淑怡",
  "刘德华",
  "古巨基",
  "叶蒨文",
  "吕方",
  "吴若希",
  "周华健",
  "周慧敏",
  "周柏豪",
  "太极乐队",
  "容祖儿",
  "张国荣",
  "张学友",
  "张敬轩",
  "张智霖",
  "彭羚",
  "徐小凤",
  "曾比特",
  "李克勤",
  "杜德伟",
  "杨千嬅",
  "林子祥",
  "林家谦",
  "林忆莲",
  "梁咏琪",
  "梁汉文",
  "梅艳芳",
  "洪卓立",
  "温兆伦",
  "温拿乐队",
  "王杰",
  "王菲",
  "甄妮",
  "罗文",
  "苏永康",
  "许冠杰",
  "许廷铿",
  "许志安",
  "谢霆锋",
  "谭咏麟",
  "邝美云",
  "邰正宵",
  "郑中基",
  "郑伊健",
  "郑秀文",
  "郭富城",
  "钟镇涛",
  "陈奕迅",
  "陈小春",
  "陈慧娴",
  "陈慧琳",
  "陈柏宇",
  "陈百强",
  "麦浚龙",
  "黄凯芹",
  "黎明",
  "黎瑞恩",
]);
const singer = {};
const get = (name) =>
  new Promise((r) =>
    https.get(
      `https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg?_=${new Date().getTime()}&ct=24&format=json&inCharset=utf-8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=1&uin=0&g_tk_new_20200303=914202061&g_tk=914202061&hostUin=0&is_xml=0&key=${decodeURIComponent(
        name
      )}`,
      async (res) => {
        const body = [];
        for await (const chuck of res) {
          body.push(chuck);
        }
        r(
          JSON.parse(String(Buffer.concat(body)))?.data?.singer?.itemlist || []
        );
      }
    )
  );

(async () => {
  for (const singerName of singerList) {
    const { name, mid } = (await get(singerName))[0];
    console.log(mid, name, singerName, name === singerName);
    singer[mid] = name;
  }
  console.log(JSON.stringify(singer, null, 2));
})();
