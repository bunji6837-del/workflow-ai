import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192x192.png", "pwa-512x512.png", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "WorkFlow AI",
        short_name: "WorkFlow AI",
        description: "엑셀 업로드로 프로젝트와 업무를 자동 생성하고 팀 채팅까지 관리하는 협업툴",
        theme_color: "#2563eb",
        background_color: "#f4f7fb",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"]
      },
      devOptions: {
        enabled: false
      }
    })
  ]
});
