const web = require("./web.js")({ port: 80 });
const https = require("https");
const fs = require("fs");

web({
  async post(cb) {
    fs.writeFile("save.json", cb.P, () => {});
    return {};
  },
  async get(cb) {
    try {
      return {
        code: 0,
        data: JSON.parse(String(await fs.promises.readFile("save.json"))),
      };
    } catch (e) {
      return { code: 0, data: [] };
    }
  },
});
