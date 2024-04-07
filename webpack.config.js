const path = require("path");
const fs = require("fs");
const { ToBat } = require("../code-snippet/webpack/ToBat");
const { CopyHTML } = require("../code-snippet/webpack/CopyHTML");
fs.mkdir("dist", () => {});

const common = {
  //mode: "development",
  mode: "production",
  //devtool: "cheap-source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
};

const serverConfig = {
  entry: {
    index: path.resolve(__dirname, "./src/server/index.ts"),
    init: path.resolve(__dirname, "./src/server/init.ts"),
  },
  target: "node",
  output: {
    path: path.resolve(__dirname, "./src/server/"),
    filename: "[name].js",
  },
  plugins: [
    new ToBat(files => {
      for (const name in files) {
        const head = name === "init.js" ? ToBat.headUAC : ToBat.head;
        const { content } = files[name];
        fs.writeFile("dist/" + name + ".bat", head + content, () => {});
      }
    }),
  ],
};
/** 打包浏览器配置 */
const copyHTML = new CopyHTML(path.resolve(__dirname, "./src/browser"), path.resolve(__dirname, "./dist"));
const clientConfig = {
  entry: copyHTML.entry,
  output: copyHTML.output,
  plugins: [copyHTML],
};
module.exports = [
  { ...common, ...serverConfig },
  { ...common, ...clientConfig },
];
