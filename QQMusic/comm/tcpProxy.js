const net = require("net");

net
  .createServer((sock) => {
    const sock2 = net.connect({ host: "u.y.qq.com", port: 443 });
    sock2.on("error", () => {});
    console.log(new Date().toLocaleString(), "连接", sock.remoteAddress);
    sock.pipe(sock2);
    sock2.pipe(sock);
  })
  .on("error", () => {})
  .listen(443, "0.0.0.0");
