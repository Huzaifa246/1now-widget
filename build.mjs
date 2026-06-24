import * as esbuild from "esbuild";

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

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: ".", port: 8770 });
  console.log(`\n  Widget dev server → http://localhost:${port}/demo/index.html\n`);
} else {
  await esbuild.build(options);
  console.log("Built dist/widget.js");
}
