import * as fs from "fs";

import { HttpProxy } from "../../../tools/dist/node/HttpProxy";
import { afterExit } from "../../../tools/dist/node/afterExit";

const proxyBindPort = 1080;
const paseHostFile = (
  onLine: (raw: string, mark: string, ip: string, host: string) => string,
  obj: { [x: string]: string } = {},
) => {
  const hostFile = String(fs.readFileSync("C:/Windows/System32/drivers/etc/hosts"));
  const newHostFile = hostFile
    .split("\n")
    .map(line => {
      const [raw, mark, ip, host] = line.trim().match(/^(\#{0,1})\s*?(\d+\.\d+\.\d+\.\d+)\s*?(\S+)$/) || [];
      if (raw) {
        if (host in obj) {
          const newIp = obj[host];
          line = `${newIp ? "" : "#"}${newIp} ${host}`;
          delete obj[host];
        } else {
          return onLine(raw, mark, ip, host) ?? line;
        }
      }
      return line;
    })
    .concat(Object.entries(obj).map(([host, newIp]) => `${newIp} ${host}`))
    .join("\n");
  if (newHostFile !== hostFile) {
    console.log("修改host文件");
    fs.writeFileSync("C:/Windows/System32/drivers/etc/hosts", newHostFile);
  }
};
(async () => {
  /** 恢复默认的host文件 */
  paseHostFile((raw, mark, ip, host) => {
    if (!mark && /\.y\.qq\.com$/.test(host)) {
      return `#${ip} ${host}`;
    }
    return raw;
  });
  /** 脚本结束后 */
  afterExit(() => {
    paseHostFile(
      raw => raw,
      [...hosts].reduce((obj, host) => ({ ...obj, [host]: "127.0.0.6" }), {}),
    );
    console.log("关闭QQ音乐客户端的代理设置，打开node服务器，重启QQ音乐客户端即可");
  });
  /** QQ音乐客户端用到的带cookie的所有域名 */
  const hosts = new Set<string>();
  console.log("******请到QQ音乐客户端修改代理地址127.0.0.1:" + proxyBindPort);
  /** 启动代理服务器 */
  new HttpProxy(["u.y.qq.com"], {
    async onNewHost(host) {
      return /\.y\.qq\.com$/.test(host);
    },
    proxyBindPort,
  }).addProxyRule(
    (method, url, headers) => Boolean(headers.cookie),
    async function* (localReq) {
      const { cookie, host } = localReq.headers || {};
      if (cookie?.match(/uid=\d+;/) && host) {
        console.log("发现新域名", host, "按Ctrl+C结束脚本即可写入host文件");
        hosts.add(host);
      }
      yield {};
      return {};
    },
  );
})();
