import * as esbuild from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "src");
const OUT = path.join(SRC, "viewer.html");

const watchMode = process.argv.includes("--watch");

async function build(): Promise<void> {
  // Bundle all TypeScript into a single IIFE
  const result = await esbuild.build({
    entryPoints: [path.join(SRC, "main.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    write: false,
    sourcemap: false,
    logLevel: "info",
  });

  const js = result.outputFiles[0].text;
  const css = fs.readFileSync(path.join(SRC, "styles.css"), "utf8");
  const template = fs.readFileSync(path.join(SRC, "base.html"), "utf8");

  const html = template
    .replace("{{CSS}}", css)
    .replace("{{JS}}", js);

  fs.writeFileSync(OUT, html, "utf8");
  console.log(`[build] wrote ${OUT} (${(html.length / 1024).toFixed(1)} KB)`);
}

if (watchMode) {
  const ctx = await esbuild.context({
    entryPoints: [path.join(SRC, "main.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    write: false,
    logLevel: "info",
    plugins: [
      {
        name: "rebuild-html",
        setup(build) {
          build.onEnd(async (result) => {
            if (result.errors.length > 0) return;
            const js = result.outputFiles![0].text;
            const css = fs.readFileSync(path.join(SRC, "styles.css"), "utf8");
            const template = fs.readFileSync(path.join(SRC, "base.html"), "utf8");
            const html = template.replace("{{CSS}}", css).replace("{{JS}}", js);
            fs.writeFileSync(OUT, html, "utf8");
            console.log(`[watch] rebuilt ${OUT}`);
          });
        },
      },
    ],
  });
  await ctx.watch();
  console.log("[watch] watching for changes…");
} else {
  await build();
}
