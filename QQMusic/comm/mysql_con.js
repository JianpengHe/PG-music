const { Mysql } = require("./Mysql");
const fs = require("fs");
const readFile = (path, err) => {
  try {
    return fs.readFileSync(path);
  } catch (e) {
    return err;
  }
};

const mysql = new Mysql({
  host:
    String(readFile(__dirname + "/../secret/dbHost.secret", "")).trim() ||
    "127.0.0.1",
  port: 3306,
  user: "root",
  password:
    String(readFile(__dirname + "/../secret/dbPassword.secret", "")).trim() ||
    "root",
  database: "qq_music",
  convertToTimestamp: true,
});
const replace = async (tableName, objArr) => {
  const keySet = new Set();
  const isArray = Array.isArray(objArr);
  if (!isArray) {
    objArr = [objArr];
  }
  objArr.forEach((item) => Object.keys(item).forEach((k) => keySet.add(k)));
  const keys = [...keySet].sort();
  if (!keys.length) {
    return {};
  }
  const sql = `insert into ${tableName}(${keys
    .map((k) => "`" + k + "`")
    .join(",")}) values (${Array(keys.length)
    .fill("?")
    .join(",")}) ON DUPLICATE KEY UPDATE ${keys
    .map((k) => `${"`" + k + "`"}=values(${"`" + k + "`"})`)
    .join(",")};`;
  const res = [];
  for (const item of objArr) {
    res.push(
      await mysql.query(
        sql,
        keys.map((k) => (item[k] === undefined ? null : item[k]))
      )
    );
  }
  return isArray ? res : res[0];
};
module.exports = { mysql, replace };

// replace("song", [
//   { song_id: 8, mid: String(Math.random()) },
//   { song_id: 9, time_public: new Date() },
// ]).then((a) => {
//   console.log(a);
// });
