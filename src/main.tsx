import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installSyncListener } from "@/lib/offline/sync";

createRoot(document.getElementById("root")!).render(<App />);

// --- PWA Service Worker registration ---
// Skip in dev / preview iframes to avoid stale-cache issues in the Lovable editor.
(() => {
  if (!("serviceWorker" in navigator)) return;
  let inIframe = false;
  try { inIframe = window.self !== window.top; } catch { inIframe = true; }
  const host = window.location.hostname;
  const isPreview = host.includes("id-preview--") || host.includes("lovableproject.com");
  const isDev = import.meta.env.DEV;

  if (inIframe || isPreview || isDev) {
    // Cleanup any previously-registered SW so the editor preview is never cached.
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) =>
      console.warn("[sw] registration failed", err)
    );
  });
})();

// Install background-sync listener regardless of SW availability
installSyncListener();
