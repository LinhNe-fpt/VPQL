import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/** Phục vụ ảnh upload động trong dev (file mới tạo sau khi chạy server). */
export function vatTuUploadsPlugin(): Plugin {
  return {
    name: "vat-tu-uploads",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (!url.startsWith("/images/vat-tu/uploads/")) return next();

        const name = url.slice("/images/vat-tu/uploads/".length);
        if (!name || name.includes("..")) return next();

        const file = join(process.cwd(), "public", "images", "vat-tu", "uploads", name);
        if (!existsSync(file)) return next();

        const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
        res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
        res.setHeader("Cache-Control", "public, max-age=3600");
        createReadStream(file).pipe(res);
      });
    },
  };
}
