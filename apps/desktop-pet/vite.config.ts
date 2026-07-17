import { cpSync, createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
// 权威宠物包位于项目根 pets/（apps/desktop-pet 的上两级）；应用内不保留第二份，
// dist/pets 仅是构建期临时副本（staging），不是权威源。
const petsDirectory = resolve(appRoot, "../../pets");

function petAssetsPlugin(): Plugin {
  return {
    name: "desktop-pet-assets",
    configureServer(server) {
      server.middlewares.use("/pets", (request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
        const filePath = resolve(petsDirectory, relativePath);
        const isInsidePetsDirectory =
          filePath === petsDirectory || filePath.startsWith(`${petsDirectory}${sep}`);

        if (!isInsidePetsDirectory || !existsSync(filePath) || !statSync(filePath).isFile()) {
          next();
          return;
        }

        const contentTypes: Record<string, string> = {
          ".json": "application/json; charset=utf-8",
          ".webp": "image/webp",
        };
        response.setHeader(
          "Content-Type",
          contentTypes[extname(filePath)] ?? "application/octet-stream",
        );
        createReadStream(filePath).pipe(response);
      });
    },
    closeBundle() {
      cpSync(petsDirectory, resolve(appRoot, "dist/pets"), {
        recursive: true,
      });
    },
  };
}

export default defineConfig({
  clearScreen: false,
  plugins: [petAssetsPlugin()],
  server: {
    strictPort: true,
    host: "127.0.0.1",
    port: 1420,
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
});
