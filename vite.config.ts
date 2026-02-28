import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { z } from "zod";
import packageJson from "./package.json";

import { themeNames, themes } from "./src/features/theme/registry";

const buildEnvSchema = z.object({
  THEME: z.enum(themeNames).catch("default"),
});

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const buildEnv = buildEnvSchema.parse(env);
  return {
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __THEME_CONFIG__: JSON.stringify(themes[buildEnv.THEME]),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@theme": path.resolve(
          __dirname,
          `src/features/theme/themes/${buildEnv.THEME}`,
        ),
      },
    },
    // 新增 build 配置，解决 cloudflare:workers 解析问题
    build: {
      rollupOptions: {
        // 将 cloudflare:workers 标记为外部模块，避免 Rollup 解析
        external: ["cloudflare:workers"],
      },
    },
    plugins: [
      cloudflare({
        viteEnvironment: {
          name: "ssr",
        },
      }),
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tailwindcss(),
      devtools(),
      tanstackStart(),
      viteReact(),
    ],
  };
});

export default config;
