const { request } = require("../comm/index");
const { XML } = require("../comm/XML");
const { replace } = require("../comm/mysql_con");

const singer = {
  "003Nz2So3XXYek": "陈奕迅",
};

(async () => {
  for (const singer_id of Object.keys(singer)) {
    const info = await request({
      module: "music.musichallSinger.SingerInfoInter",
      method: "GetSingerDetail",
      param: {
        singer_mids: [singer_id],
        pic: 1,
        group_singer: 1,
        wiki_singer: 1,
        ex_singer: 1,
      },
    });
    const { basic_info, ex_info, wiki } = info.singer_list[0];
    await replace("singer", {
      singer_id: basic_info.singer_id,
      singer_mid: basic_info.singer_mid,
      name: basic_info.name,
      describe: ex_info.desc,
      foreign_name: ex_info.foreign_name,
      birthday: new Date(ex_info.birthday),
      genre: ex_info.genre,
      wiki: JSON.stringify(
        XML.parse(wiki, ({ path }) => path[path.length - 1] === "item").info
      ),
    });
  }

  process.exit();
})();
