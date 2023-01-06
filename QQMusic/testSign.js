const { getQQmusicData } = require("./QQmusicSign.js");
getQQmusicData(
  {
    module: "music.musichallSinger.SingerInfoInter",
    method: "GetSingerDetail",
    param: {
      singer_mids: ["003Nz2So3XXYek"],
      pic: 1,
      group_singer: 1,
      wiki_singer: 1,
      ex_singer: 1,
    },
  },
  ({ data }) => {
    console.log(data.singer_list[0]);
  }
);
0 &&
  getQQmusicData(
    [
      /** 获取歌手专辑 */
      {
        module: "music.musichallAlbum.AlbumListServer",
        method: "GetAlbumList",
        param: {
          sort: 5,
          singermid: "003Nz2So3XXYek",
          begin: 0,
          num: 80,
        },
      },
      /** 专辑信息 */
      {
        module: "music.musichallAlbum.AlbumInfoServer",
        method: "GetAlbumDetail",
        param: { albumMid: "004Z85XP1c25b7" },
      },
      /** 专辑歌曲 */
      {
        module: "music.musichallAlbum.AlbumSongList",
        method: "GetAlbumSongList",
        param: { albumMid: "004Z85XP1c25b7", begin: 0, num: 60, order: 2 },
      },
      /** 获取歌手歌曲 */
      {
        module: "music.musichallSong.SongListInter",
        method: "GetSingerSongList",
        param: {
          singerMid: "003Nz2So3XXYek",
          begin: 0,
          num: 30,
          order: 1,
        },
      },
      /** 搜索歌曲 */
      {
        method: "DoSearchForQQMusicDesktop",
        module: "music.search.SearchCgiService",
        param: {
          num_per_page: 60,
          page_num: 1,
          query: "陈奕迅",
          search_type: 0,
        },
      },
      /** 获取歌曲评论数 */
      {
        method: "GetCommentCount",
        module: "GlobalComment.GlobalCommentReadServer",
        param: {
          request_list: [
            { biz_type: 1, biz_id: "1249550", biz_sub_type: 1 },
            { biz_type: 1, biz_id: "260677", biz_sub_type: 1 },
          ],
        },
      },
      /** 歌曲播放地址 */
      {
        module: "vkey.GetVkeyServer",
        method: "CgiGetVkey",
        param: {
          guid: "1",
          songmid: ["003aAPj81VWrbL"],
          filename: ["C4000032PB2V2QYWSC.m4a", "M8000032PB2V2QYWSC.mp3"],
          songtype: [0],
          uin: "1",
          loginflag: 1,
          platform: "20",
        },
      },
      /** 歌曲歌词 */
      {
        module: "music.musichallSong.PlayLyricInfo",
        method: "GetPlayLyricInfo",
        param: {
          qrc: 1,
          qrc_t: 0,
          roma: 0,
          roma_t: 0,
          //singerName: "5a+M5aOr5bGx5LiL",
          songID: 260677,
          // songName: "6ZmI5aWV6L+F",
          trans: 0,
          trans_t: 0,
          type: 0,
        },
      },
    ],
    (data) => {
      console.log(data);
    },
    true
  );
