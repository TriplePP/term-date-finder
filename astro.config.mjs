import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  // /school/144830.html is served at /school/144830 on Cloudflare Pages.
  build: { format: "file", inlineStylesheets: "never" },
  // Keep every script and style in its own file so the Content-Security-Policy
  // in public/_headers can forbid inline code.
  vite: { build: { assetsInlineLimit: 0 } },
});
