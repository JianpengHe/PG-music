const { mysql } = require("../comm/mysql_con");
const fs = require("fs");
mysql
  .query(
    `SELECT name,duration,mid,media_mid,total,singer FROM (SELECT sum(comment_count) as total,count(*) as num,name,singer,CONCAT(max(comment_count)," - ",name," - ",singer) as k FROM song WHERE language=1 and comment_count>0 and singer in ("BEYOND", "侧田", "关正杰", "关淑怡", "刘德华", "古巨基", "叶蒨文", "吕方", "吴若希", "周华健", "周慧敏", "周柏豪", "容祖儿", "左麟右李", "张国荣", "张学友", "张敬轩", "张智霖", "徐小凤", "李克勤", "杜德伟", "杨千嬅", "林子祥", "林峯", "林忆莲", "梁咏琪", "梁汉文", "梅艳芳", "汪明荃", "洪卓立", "温兆伦", "温拿乐队", "王杰", "王祖蓝", "王菲", "甄妮", "罗文", "草蜢", "蔡国权", "许冠杰", "许廷铿", "许志安", "谢安琪", "谢霆锋", "谭咏麟", "邝美云", "邰正宵", "郑中基", "郑伊健", "郑秀文", "郭富城", "钟镇涛", "陈奕迅", "陈小春", "陈慧娴", "陈慧琳", "陈柏宇", "陈百强", "黄凯芹", "黎明") GROUP BY singer,name)a LEFT JOIN (SELECT mid,media_mid,duration,CONCAT(comment_count," - ",name," - ",singer) as k FROM song) b on a.k=b.k`,
    []
  )
  .then(a => {
    const singer = new Map();
    a.forEach(b => {
      b.singer = String(b.singer);
      b.total = Number(String(b.total));
      if (!singer.has(b.singer)) {
        singer.set(b.singer, []);
      }
      singer.get(b.singer).push(b);
    });
    fs.writeFileSync(
      "root/allsongs.js",
      "var info=" +
        JSON.stringify(
          [...singer.keys()].reduce((c, d) => ({ ...c, [d]: { length: singer.get(d).length, song: [] } }), {})
        )
    );
    [...singer.keys()].forEach(s => {
      console.log(s);
      fs.writeFileSync("root/" + s + ".json", JSON.stringify(singer.get(s)));
    });
    process.exit();
  });
