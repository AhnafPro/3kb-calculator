// Turns src/index.html into one data URI. Run: node build.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { minify as minifyJs } from "terser";
import { minify as minifyHtml } from "html-minifier-terser";

const LIMIT = 3072;
const src = readFileSync("src/index.html", "utf8");

// 1. Process custom blocks (like glsl if any) and run terser on scripts
let processedSrc = "";
for (const part of src.split(/(<script>[\s\S]*?<\/script>|<style>[\s\S]*?<\/style>)/)) {
  if (part.startsWith("<script>")) {
    const js = part.slice(8, -9);
    const { code } = await minifyJs(js, { toplevel: true, compress: { passes: 5, unsafe: true } });
    processedSrc += "<script>" + code + "</script>";
  } else {
    processedSrc += part;
  }
}

// 2. Aggressive HTML & CSS minification using html-minifier-terser
const html = await minifyHtml(processedSrc, {
  collapseWhitespace: true,
  removeComments: true,
  removeAttributeQuotes: true, // Drops quotes around attributes when safe
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,             // Squeezes all CSS rules tightly
  minifyJS: true,
  sortAttributes: true,
  sortClassName: true
});

// Only these three break a data URI. Encoding anything else costs bytes for nothing.
const uri = "data:text/html," + html.replace(/%/g, "%25").replace(/#/g, "%23").replace(/\n/g, "%0A");

mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", html);
writeFileSync("dist/uri.txt", uri);

const bytes = Buffer.byteLength(uri);
console.log(bytes + " / " + LIMIT + " bytes, " + (bytes > LIMIT ? bytes - LIMIT + " over" : LIMIT - bytes + " left"));