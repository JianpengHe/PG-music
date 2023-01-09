const https = require("https");

const singerList = ["陈奕迅", "陈百强"];
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
    console.log(mid, name);
    singer[mid] = name;
  }
  console.log(JSON.stringify(singer, null, 2));
})();
