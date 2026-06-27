import { encodeLyricToken } from "./common/lyricConvert";
import { lyricDecoder } from "./common/lyricDecoder";
import { inflateUint8Array, isServer, jsonpFetch, QQserverUrlSmartbox } from "./common/utils";

export class QQmusicAPI {
  constructor(protected readonly serverUrl: string) {}
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
      return encodeLyricToken(await inflateUint8Array(lyricDecoder(data.lyric)), []);
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
    const { data } = await this.request("CgiGetVkey", "vkey.GetVkeyServer", {
      guid: "1",
      songmid: [songmid],
      filename: [fileName],
      songtype: [1],
      uin: "1",
      loginflag: 1,
      platform: "20",
    });
    //
    let purl = data?.midurlinfo?.[0]?.purl;
    if (!purl && !isServer) {
      const res = await (await fetch(this.serverUrl + "/play/" + fileName + ".vkey?songmid=" + songmid)).json();
      purl = res.purl;
    }
    if (!purl) throw new Error("获取播放URL失败");
    return "https://ws.stream.qqmusic.qq.com/" + purl;
  }
}
