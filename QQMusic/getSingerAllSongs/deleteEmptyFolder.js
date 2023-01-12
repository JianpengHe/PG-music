const fs = require("fs");
const path = "D:/qsongs/data";
(async () => {
  for (const h of await fs.promises.readdir(path, { withFileTypes: true })) {
    if (h.isDirectory() && (await fs.promises.readdir(path + "/" + h.name)).length === 0) {
      await fs.promises.rmdir(path + "/" + h.name);
    }
  }
})();
