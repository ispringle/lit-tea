import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "lit-tea": resolve(__dirname, "./tea.ts"),
    },
  },
});
