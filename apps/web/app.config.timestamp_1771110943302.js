// app.config.ts
import { defineConfig } from "vinxi";
import { TanStackStartVitePlugin } from "@tanstack/react-start-plugin";
import viteReact from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var app_config_default = defineConfig({
  vite: {
    plugins: [
      viteReact(),
      TanStackStartVitePlugin()
    ],
    resolve: {
      alias: {
        "@": join(__dirname, "./src")
      }
    }
  }
});
export {
  app_config_default as default
};
