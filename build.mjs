import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";

const serve = process.argv.includes("--serve");

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ["src/widget.ts"],
  bundle: true,
  format: "iife",
  target: ["es2018"],
  minify: !serve,
  sourcemap: serve,
  outfile: "dist/widget.js",
  banner: {
    js: "/* 1Now Booking Engine widget — https://1now.ai — embed on any site. */",
  },
};

// Production build starts from a clean dist/ (drops stale files like old sourcemaps).
if (!serve) rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

/** Copy static assets (index.html, etc.) from public/ into dist/ so the
 *  deploy folder has an entry document alongside the bundled widget.js. */
function copyPublic() {
  if (existsSync("public")) cpSync("public", "dist", { recursive: true });
}

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  copyPublic();
  const { port } = await ctx.serve({ servedir: ".", port: 8770 });
  console.log(`\n  Widget dev server → http://localhost:${port}/demo/index.html\n`);
} else {
  await esbuild.build(options);
  copyPublic();
  console.log("Built dist/widget.js + dist/index.html");
}
