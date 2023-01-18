const fs = require("fs");
const path = "D:/qsongs/data";
0 &&
  (async () => {
    for (const h of await fs.promises.readdir(path, { withFileTypes: true })) {
      if (h.isDirectory() && (await fs.promises.readdir(path + "/" + h.name)).length === 0) {
        await fs.promises.rmdir(path + "/" + h.name);
      }
    }
  })();

(async () => {
  const readdir = async path => {
    for (const h of await fs.promises.readdir(path, { withFileTypes: true })) {
      if (h.isDirectory()) {
        await readdir(path + "/" + h.name);
        continue;
      }
      if (!(await fs.promises.stat(path + "/" + h.name)).size) {
        console.log("删除", path + "/" + h.name);
        await fs.promises.unlink(path + "/" + h.name);
      }
    }
  };
  await readdir("album");
})();
