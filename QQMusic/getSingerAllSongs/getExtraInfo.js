const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const { request, GetCommentCount, getFansCount } = require("../comm/index");
const { replace, mysql } = workerData?.mysql_con || require("../comm/mysql_con");
const { getLyric } = require("../LyricDecode/getLyric");

const flat = (arr, ...keys) => {
  const lastKey = keys.splice(-1, 1)[0];
  return keys.reduce((arr, key) => arr.map(obj => obj[key]).flat(), arr).map(obj => obj[lastKey]);
};

const unFlat = (arr, num, ...count) => {
  const o = Array(Math.ceil(arr.length / num))
    .fill(0)
    .map((_, i) => arr.slice(i * num, (i + 1) * num));
  if (count.length === 0) {
    return o;
  }
  return unFlat(o, ...count);
};

const commentCount = async () => {
  const song_ids = flat(await mysql.query("SELECT song_id FROM `song` WHERE `comment_count` IS NULL", []), "song_id");
  let i = 0;
  for (const req of unFlat(song_ids, 25, 10)) {
    console.log("GetCommentCount", song_ids.length - i * 250, i);
    i++;
    await replace(
      "song",
      flat(await request(req.map(GetCommentCount), false), "response_list")
        .flat()
        .map(({ biz_id, count }) => ({
          song_id: Number(biz_id),
          comment_count: count,
        }))
    );
    //return;
  }
};

const getLyrics = async (start = 0) => {
  const songList = await mysql.query(
    "SELECT song_id,singer,name FROM `song` WHERE `lyric` IS NULL  ORDER BY `song_id` ASC LIMIT 0,1000;",
    []
  );
  let i = 0;
  for (const req of unFlat(songList, 25)) {
    console.log("getLyrics", "第", start, "次", songList.length - i * 25);
    i++;
    await replace(
      "song",
      (await getLyric(req)).filter(({ song_id }) => song_id)
    );
    // return;
  }
  if (songList.length === 1000) {
    await getLyrics(start + 1);
  }
};

const getFansCounts = async () => {
  const db = [];
  for (const { singer_id, singer_mid, name } of await mysql.query(
    "SELECT singer_id,singer_mid,name FROM `singer` WHERE `fans_count` IS NULL",
    []
  )) {
    console.log("getFansCounts", name);
    db.push({ singer_id, fans_count: await getFansCount(singer_mid) });
  }
  await replace("singer", db);
};

(async () => {
  if (!isMainThread) {
    console.log("Worker", __filename, "启动");
  }
  await commentCount();
  await getLyrics();
  await getFansCounts();
  setTimeout(() => {
    process.exit();
  }, 1000);
})();
