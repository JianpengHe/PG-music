import { DataStorage, IDataStorage } from "../../../code-snippet/common/DataStorage";
import { LyricToken, encodeLcrLyricToken, encodeLyricToken } from "./common/lyricConvert";
import { lyricDecoder } from "./common/lyricDecoder";
import {
  base64ToUint8Array,
  isServer,
  jsonpFetch,
  QQserverUrlSmartbox,
  uint8Array8ToBase64,
  uint8ArrayToString,
  unzip,
  zip,
} from "./common/utils";
export type IQQmusicAPIDataStorage = {
  url: IDataStorage<Record<string, { url: string; file: string; expire: number }>>;
  lyric: IDataStorage<Record<string, LyricToken[]>>;
};
const QQmusicAPIDataStorage: IQQmusicAPIDataStorage = {
  url: {
    data: {},
    read: val => {
      const now = Math.floor(Date.now() / 1000);
      return Object.fromEntries(
        String(val || "")
          .split("\n")
          .map(item => {
            const expire = Number(item.substring(0, 10));
            const url = item.substring(10) || "";
            const file = url.match(/\/([^?/]+)\?/)?.[1] ?? "";
            if (!expire || !file || !url || expire < now) return null;
            return [file, { url, file, expire }];
          })
          .filter(Boolean) as any,
      );
    },
    write: obj => {
      const now = Math.floor(Date.now() / 1000);
      return Object.values(obj)
        .filter(({ expire }) => expire > now)
        .map(({ url, expire }) => `${expire}${url}`)
        .join("\n");
    },
  },
  lyric: {
    data: {},
    read: async val => JSON.parse(await unzip(base64ToUint8Array(val))),
    write: async val => uint8Array8ToBase64(new Uint8Array(await zip(JSON.stringify(val)))),
  },
};

export class QQmusicAPI {
  protected readonly storage: DataStorage<IQQmusicAPIDataStorage>;
  constructor(
    protected readonly serverUrl: string,
    storagePath?: string,
  ) {
    this.storage = new DataStorage(QQmusicAPIDataStorage, storagePath || "");
  }
  protected request(method: string, module: string, param: any): Promise<{ code: number; data: any }> {
    throw new Error("Method not implemented.");
  }
  public async smartbox(kw: string) {
    if (!kw) return [];
    const reqObj: Record<string, any> = {
      is_xml: 0,
      key: kw,
      g_tk_new_20200303: 15037823,
      g_tk: 15037823,
      loginUin: 0,
      hostUin: 0,
      format: "json",
      inCharset: "utf8",
      outCharset: "utf-8",
      notice: 0,
      platform: "yqq.json",
      needNewCode: 0,
    };
    const url = new URL(QQserverUrlSmartbox);
    if (isServer) for (const key in reqObj) url.searchParams.append(key, reqObj[key]);
    const resData = await (isServer
      ? (await fetch(String(url))).json()
      : jsonpFetch(reqObj, String(url), "jsonpCallback"));

    return resData?.data?.song?.itemlist?.map(({ name, singer }: any) => `${name} ${singer}`) || [];
  }
  public async lyric(songID: number) {
    const lyric = this.storage.get("lyric")[String(songID)];
    if (lyric) return lyric;
    const { code, data } = await this.request("GetPlayLyricInfo", "music.musichallSong.PlayLyricInfo", {
      qrc: 1,
      qrc_t: 0,
      roma: 0,
      roma_t: 0,
      songID,
      trans: 0,
      trans_t: 0,
      type: 0,
    });
    if (code !== 0) throw new Error("获取歌词失败");
    try {
      const raw = data.qrc
        ? await unzip(lyricDecoder(data.lyric), "deflate")
        : uint8ArrayToString(base64ToUint8Array(data.lyric));
      const lyricTokens = data.qrc ? encodeLyricToken(raw, []) : encodeLcrLyricToken(raw);
      const lyricMap = this.storage.get("lyric");
      const keys = Object.keys(lyricMap);
      /** 最多缓存30首歌的歌词，超出部分删除 */
      if (keys.length > 30) for (const id of keys.slice(0, 30 - keys.length)) delete lyricMap[id];
      lyricMap[String(songID)] = lyricTokens;
      this.storage.set("lyric", lyricMap);
      return lyricTokens;
    } catch (error: unknown) {
      console.error("处理歌词数据时出错:", error);
      return [];
    }
  }

  public async search(
    keyword: string,
    pageNum: number = 1,
    numPerPage: number = 10,
    searchType: number = 0,
  ): Promise<{
    sum: number;
    list: {
      id: number;
      name: string;
      interval: string;
      mid: string;
      album: {
        id: number;
        mid: string;
        name: string;
        pmid: string;
        subtitle: string;
        time_public: string;
        title: string;
      };
      singer: {
        id: number;
        mid: string;
        name: string;
        title: string;
      }[];
      file: {
        media_mid: string;
      };
      mv: { id: number; vid: string };
      vi: number[];
    }[];
  }> {
    let o = { sum: 0, list: [] };
    const res = await this.request("DoSearchForQQMusicDesktop", "music.search.SearchCgiService", {
      num_per_page: numPerPage,
      page_num: pageNum,
      query: keyword,
      search_type: searchType,
      searchid: String(Math.random()).substring(2),
    });
    if (res?.code === 0) {
      o = { list: res?.data?.body?.song?.list || [], sum: res?.data?.meta?.sum || 0 };
    } else {
      if (isServer) throw new Error("搜索失败");
      o = await (await fetch(`${this.serverUrl}/search/${pageNum}/${keyword}`)).json();
    }
    return o;
  }

  public async playURL(songmid: string, fileName: string) {
    const urlMap = this.storage.get("url");
    if (urlMap[fileName] && urlMap[fileName].expire > Math.floor(Date.now() / 1000)) return urlMap[fileName].url;
    const { data } = await this.request("CgiGetVkey", "vkey.GetVkeyServer", {
      guid: "1",
      songmid: [songmid],
      filename: [fileName],
      songtype: [1],
      uin: "1",
      loginflag: 1,
      platform: "20",
    });

    const { midurlinfo, expiration } = data || {};
    let purl = midurlinfo?.[0]?.purl;
    let expire = expiration + Math.floor(Date.now() / 1000) - 400;
    if (!purl && !isServer) {
      const res = await fetch(this.serverUrl + "/play/" + fileName + ".vkey?songmid=" + songmid);
      const body = await res.json();
      purl = body.purl;
      expire = Math.floor(new Date(res.headers.get("Expires") ?? new Date()).getTime() / 1000);
    }
    if (!purl) throw new Error("获取播放URL失败");
    purl = "https://ws.stream.qqmusic.qq.com/" + purl;
    urlMap[fileName] = { url: purl, expire, file: fileName };
    this.storage.set("url", urlMap);
    return purl;
  }

  public async songDetail(song_mid: string) {
    const { code, data } = await this.request("get_song_detail_yqq", "music.pf_song_detail_svr", {
      song_type: 0,
      song_mid,
    });
    console.log(data);
    return data;
  }
  public async mvURL(mv_mid?: string) {
    if (!mv_mid) return "";
    const { code, data } = await this.request("GetMvUrls", "music.stream.MvUrlProxy", {
      vids: [mv_mid],
      // // guid: get_guid(),
      // videoformat: 1,
      // dolby: 1,
      // use_new_domain: 1,
      // use_ipv6: 1,
      filetype: 10,
      format: 265,
      maxFiletype: 60,
      request_type: 10003,
      testCdn: 1,
    });
    if (!Array.isArray(data[mv_mid]?.mp4)) throw new Error("获取MV URL失败");
    const { freeflow_url, urlPath } =
      data[mv_mid].mp4
        .filter((item: any) => item.urlPath)
        .sort((a: any, b: any) => (b.fileSize || 0) - (a.fileSize || 0))[0] || {};

    return String(
      freeflow_url?.find((item: string) => item.startsWith("https://")) || `https://mv.music.tc.qq.com/` + urlPath,
    );
  }
  public getMusicImgUrl(pmid: string) {
    return `https://y.gtimg.cn/music/photo_new/T002R300x300M000${pmid}.jpg?max_age=2592000`;
  }
}
