//const https = require("https");
/** 请先运行存储过程“创建下载列表” */
//const { replace, mysql } = require("../comm/mysql_con");
const { request } = require("../comm/index");
/** 0.未登录 1.免费试听 2.VIP用户 */
const Method = Number(process.argv[2] || 0);
let useCookie = false;
const fileType = [
  ["C400", ".m4a", "96aac"],
  ["M800", ".mp3", "320mp3"],
  ["F000", ".flac", "flac"],
];
const getSQL = (LIMIT = "") => {
  let is_vip = false;
  let getAllType = false;
  let filter = "(expire is null or expire<now())";

  switch (Method) {
    case 0:
      is_vip = false;
      getAllType = false;
      break;
    case 1:
      is_vip = true;
      getAllType = false;
      break;
    case 2:
      is_vip = true;
      getAllType = true;
      break;
  }

  if (is_vip) {
    useCookie = true;
  } else {
    filter += " and is_vip=0";
  }

  filter += ` and (${fileType
    .slice(0, getAllType ? fileType.length : 1)
    .map(([_, _2, d_name]) => `(RAM_size_${d_name} is null AND size_${d_name} !=0)`)
    .join(" or ")})`;

  return (
    "SELECT album_id,a.* FROM (SELECT media_mid,size_96aac,size_320mp3,size_flac,is_vip,down_mid FROM `download` WHERE " +
    (filter || 1) +
    (LIMIT ? ` LIMIT ${LIMIT}` : "") +
    ") a INNER JOIN song on a.media_mid=song.media_mid;"
  );
};

(async () => {
  const sql = getSQL();
  console.log();
})();
