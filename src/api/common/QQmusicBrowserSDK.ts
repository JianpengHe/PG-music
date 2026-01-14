import { encodeLyricToken } from "./lyricConvert";
import lyricDecoder from "./lyricDecoder";
import QQmusicSign from "./QQmusicSign";

type IQQmusicRequest = {
  method: string;
  module: string;
  param: any;
  callback: (data: any) => void;
};
type IQQmusicResponse = {
  code: number;
  data: any;
};

class QQmusicRequest {
  constructor(
    private serverUrl: string,
    private cdnUrl: string = serverUrl,
    private QQserverUrl: string = "https://u.y.qq.com/cgi-bin/musics.fcg",
  ) {}
  private readonly jsonpRequestQueue: IQQmusicRequest[] = [];
  private readonly cdnRequestQueue: IQQmusicRequest[] = [];
  private readonly serverRequestQueue: IQQmusicRequest[] = [];
  private needClear: boolean = false;
  public requestJsonp(method: string, module: string, param: any): Promise<IQQmusicResponse> {
    this.clearQueue();
    return new Promise((resolve, reject) => {
      this.jsonpRequestQueue.push({ method, module, param, callback: resolve });
    });
  }
  public requestCdn(method: string, module: string, param: any): Promise<IQQmusicResponse> {
    this.clearQueue();
    return new Promise((resolve, reject) => {
      this.cdnRequestQueue.push({ method, module, param, callback: resolve });
    });
  }
  public requestServer(method: string, module: string, param: any): Promise<IQQmusicResponse> {
    this.clearQueue();
    return new Promise((resolve, reject) => {
      this.serverRequestQueue.push({ method, module, param, callback: resolve });
    });
  }
  public async clearQueue() {
    if (this.needClear) return;
    this.needClear = true;
    if (!window["$MD5"]) {
      const md5Script = document.createElement("script");
      md5Script.src = "https://tool.hejianpeng.cn/js/md5.js";
      document.head.appendChild(md5Script);
      await new Promise((resolve, reject) => {
        md5Script.onload = resolve;
        md5Script.onerror = reject;
      });
    } else {
      await Promise.resolve();
    }

    this.clearJsonpQueue();
    this.clearCdnQueue();
    // this.clearServerQueue();
    this.needClear = false;
  }
  private markRequest(requestsArray: IQQmusicRequest[], request: (reqBody: string, sign: string) => Promise<any>) {
    const requestData = JSON.stringify(
      requestsArray.reduce(
        (accumulator, currentRequest, index) => {
          accumulator[`req_${index}`] = currentRequest;
          return accumulator;
        },
        {
          // 通用请求参数
          comm: {
            format: "json",
            inCharset: "utf-8",
            outCharset: "utf-8",
            notice: 0,
            platform: "yqq.json",
            needNewCode: 1,
            uin: "1",
          },
        },
      ),
    );

    request(requestData, QQmusicSign(requestData))
      .then(response => {
        // 处理响应数据
        for (let i = 0; i < requestsArray.length; i++) requestsArray[i].callback(response[`req_${i}`]);
      })
      .catch(error => {
        // 处理错误
        console.error("QQ音乐API请求失败:", error);
        for (let i = 0; i < requestsArray.length; i++) requestsArray[i].callback(null);
      });
  }
  private clearJsonpQueue() {
    if (this.jsonpRequestQueue.length === 0) return;
    const requestsArray = [...this.jsonpRequestQueue];
    this.jsonpRequestQueue.length = 0;

    // 创建唯一的JSONP回调函数名
    const callbackName = `penggeJsonp${String(Math.random()).substring(2)}`;

    this.markRequest(
      requestsArray,
      (reqBody, sign) =>
        new Promise((resolve, reject) => {
          // 创建JSONP脚本元素
          const jsonpScript = document.createElement("script");
          const url = new URL(this.QQserverUrl, window.location.href);
          url.searchParams.append("_", new Date().getTime().toString());
          url.searchParams.append("sign", sign);
          url.searchParams.append("data", reqBody);
          url.searchParams.append("format", "jsonp");
          url.searchParams.append("inCharset", "utf8");
          url.searchParams.append("outCharset", "utf-8");
          url.searchParams.append("notice", "0");
          url.searchParams.append("platform", "yqq");
          url.searchParams.append("needNewCode", "0");
          url.searchParams.append("callback", callbackName);
          jsonpScript.src = url.toString();

          // 添加错误处理
          jsonpScript.onerror = () => {
            console.error("QQ音乐API请求失败");
            document.body.removeChild(jsonpScript);
            // 清理全局回调
            delete window[callbackName];
            reject(new Error("JSONP请求失败"));
          };

          // 添加脚本到文档
          document.body.appendChild(jsonpScript);

          // 脚本加载完成后移除
          jsonpScript.onload = () => document.body.removeChild(jsonpScript);
          window[callbackName] = (data: any) => {
            delete window[callbackName];
            resolve(data);
          };
        }),
    );
  }
  private clearCdnQueue() {
    if (this.cdnRequestQueue.length === 0) return;
    const requestsArray = [...this.cdnRequestQueue];
    this.cdnRequestQueue.length = 0;
    this.markRequest(requestsArray, async (reqBody, sign) =>
      fetch(this.cdnUrl + "?sign=" + sign, { method: "POST", body: reqBody }).then(res => res.json()),
    );
  }
}

export class QQmusicBrowserSDK extends QQmusicRequest {
  /**
   * 使用浏览器原生API解压缩Uint8Array格式的inflate数据
   * 该函数将压缩的二进制数据转换为可读文本
   * @param {Uint8Array} compressedData - 压缩后的数据
   * @returns {Promise<string>} 解压后的文本数据
   */
  static async inflateUint8Array(compressedData: Uint8Array): Promise<string> {
    try {
      // 去除尾部无效的 0
      let end = compressedData.length;
      while (end > 0 && compressedData[end - 1] === 0) end--;

      const stream = new Blob([compressedData.subarray(0, end)])
        .stream()
        .pipeThrough(new DecompressionStream("deflate"));

      // 直接用 Response 读取解压后的 ArrayBuffer
      const buffer = await new Response(stream).arrayBuffer();

      return new TextDecoder().decode(buffer);
    } catch (err) {
      console.error("解压数据时出错:", err);
      throw new Error("解压数据失败: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  public async lyric(songID: number) {
    const { code, data } = await this.requestJsonp("GetPlayLyricInfo", "music.musichallSong.PlayLyricInfo", {
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
      return encodeLyricToken(await QQmusicBrowserSDK.inflateUint8Array(lyricDecoder(data.lyric)));
    } catch (error: unknown) {
      console.error("处理歌词数据时出错:", error);
      return [];
    }
  }

  public async search(keyword: string, pageNum: number = 1, numPerPage: number = 10, searchType: number = 0) {
    const { code, data } = await this.requestCdn("DoSearchForQQMusicDesktop", "music.search.SearchCgiService", {
      num_per_page: numPerPage,
      page_num: pageNum,
      query: keyword,
      search_type: searchType,
    });
    if (code !== 0) throw new Error("搜索失败");
    return { ...data.body, sum: data.meta.sum } as {
      song: {
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
      };
      sum: number;
    };
  }

  public async playURL(songmid: string, fileName: string) {
    const { data } = await this.requestJsonp("CgiGetVkey", "vkey.GetVkeyServer", {
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
    if (!purl) {
      const res = await (
        await fetch("https://tool.hejianpeng.cn/music/api/play/" + fileName + ".vkey?songmid=" + songmid)
      ).json();
      purl = res.purl;
    }
    if (!purl) throw new Error("获取播放URL失败");
    return "https://ws.stream.qqmusic.qq.com/" + purl;
  }
}
