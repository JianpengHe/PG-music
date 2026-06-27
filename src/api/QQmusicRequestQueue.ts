import { QQmusicComm } from "./common/utils";

type IQQmusicRequest<Req, Res> = {
  method: string;
  module: string;
  param: Req;
  resolve: (data: Res) => void;
  reject: (error: any) => void;
};
type IQQmusicResponse<Res> = {
  code: number;
  data: Res;
};

export class QQmusicRequestQueue {
  constructor(
    private QQmusicFetch: (reqBody: string) => Promise<any>,
    private comm?: typeof QQmusicComm,
  ) {
    this.comm = { ...QQmusicComm, ...comm };
  }
  private readonly queue: IQQmusicRequest<any, any>[] = [];
  private needClear: boolean = false;
  public add<Req = any, Res = any>(method: string, module: string, param: Req): Promise<IQQmusicResponse<Res>> {
    if (!this.needClear) {
      Promise.resolve().then(() => this.clearQueue());
      this.needClear = true;
    }
    return new Promise((resolve, reject) => this.queue.push({ method, module, param, resolve, reject }));
  }
  private async markRequest(requestsArray: IQQmusicRequest<any, any>[], request: (reqBody: string) => Promise<any>) {
    const requestData = JSON.stringify(
      requestsArray.reduce(
        (accumulator: any, currentRequest, index) => {
          accumulator[`req_${index}`] = currentRequest;
          return accumulator;
        },
        {
          // 通用请求参数
          comm: this.comm,
        },
      ),
    );

    request(requestData)
      .then(response => {
        // 处理响应数据
        for (let i = 0; i < requestsArray.length; i++) requestsArray[i].resolve(response[`req_${i}`]);
      })
      .catch(error => {
        // 处理错误
        console.error("QQ音乐API请求失败:", error);
        for (let i = 0; i < requestsArray.length; i++) requestsArray[i].reject(error);
      });
  }

  private clearQueue() {
    if (this.queue.length === 0) return;
    const requestsArray = [...this.queue];
    this.queue.length = 0;
    this.markRequest(requestsArray, reqBody => this.QQmusicFetch(reqBody));
    this.needClear = false;
  }
}
