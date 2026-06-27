import { QQmusicAPI } from ".";
import { QQmusicFetch } from "./common/QQmusicFetch";
import { QQmusicSign, loadMD5 } from "./common/QQmusicSign";
import { jsonpFetch, needLoginMethods, QQserverUrl } from "./common/utils";
import { QQmusicRequestQueue } from "./QQmusicRequestQueue";

export class QQmusicBrowserSDK extends QQmusicAPI {
  private readonly serverQueue = new QQmusicRequestQueue(reqBody => QQmusicFetch(reqBody, this.serverUrl));
  private readonly cdnQueue = new QQmusicRequestQueue(reqBody => QQmusicFetch(reqBody, this.cdnUrl));
  private readonly jsonpQueue = new QQmusicRequestQueue(data =>
    loadMD5().then(() =>
      jsonpFetch(
        {
          _: new Date().getTime().toString(),
          format: "jsonp",
          data,
          sign: QQmusicSign(data),
          inCharset: "utf8",
          outCharset: "utf-8",
          notice: "0",
          platform: "yqq",
          needNewCode: "0",
        },
        QQserverUrl,
      ),
    ),
  );
  constructor(
    protected readonly serverUrl: string,
    private readonly cdnUrl: string = serverUrl,
  ) {
    super(serverUrl);
  }
  protected request(method: string, module: string, param: any): Promise<{ code: number; data: any }> {
    // if (needLoginMethods.includes(method)) return this.serverQueue.add(method, module, param);
    if (method === "DoSearchForQQMusicDesktop") return this.cdnQueue.add(method, module, param);
    return this.jsonpQueue.add(method, module, param);
  }
}
