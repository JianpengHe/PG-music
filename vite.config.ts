import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ command }) => {
  return {
    // 关键点：如果是 build 状态才加载单文件插件，开发环境(serve)不加载
    plugins: [vue(), command === "build" ? viteSingleFile() : null],
    root: "src/browser",
    base: "./",

    // 路径别名
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src/browser"),
      },
    },

    // 开发服务器
    server: {
      host: "0.0.0.0",
      port: 3000,
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ""),
        },
      },
      watch: {
        usePolling: true, // 修复HMR热更新失效
      },
      allowedHosts: ["t.hejianpeng.com"],
    },

    // 打包配置
    build: {
      outDir: path.resolve(__dirname, "dist"),
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      emptyOutDir: true,
    },
  };
});
