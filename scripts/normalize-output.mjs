import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("_site");
const siteOrigin = "https://talkingml.com";

const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
    } else {
      files.push(entryPath);
    }
  }

  return files;
};

const files = await listFiles(outputDirectory);
const htmlFiles = files.filter((file) => file.endsWith(".html"));

const canonicalPathFor = (generatedPath) => {
  if (generatedPath === "/index.html") return "/";
  if (generatedPath.endsWith("/index.html")) {
    return generatedPath.slice(0, -"index.html".length);
  }
  return generatedPath.slice(0, -".html".length);
};

const canonicalPaths = new Map(
  htmlFiles.map((file) => {
    const relative = path.relative(outputDirectory, file).split(path.sep).join("/");
    const generatedPath = `/${relative}`;
    return [generatedPath, canonicalPathFor(generatedPath)];
  }),
);

const normalizeLocalUrl = (value, basePath = "/") => {
  if (typeof value !== "string") return value;

  const normalizedRootPath =
    value === "/."
      ? "/"
      : value.replace(/^\/\.\/+/, "/").replace(/^\.\/{2,}/, "/");

  if (!normalizedRootPath.includes(".html")) return normalizedRootPath;
  value = normalizedRootPath;
  if (/^(?:mailto:|tel:|data:|javascript:|#)/.test(value)) return value;

  let resolved;
  try {
    resolved = new URL(value, new URL(basePath, siteOrigin));
  } catch {
    return value;
  }

  if (resolved.origin !== siteOrigin) return value;

  const canonicalPath = canonicalPaths.get(resolved.pathname);
  if (!canonicalPath) return value;

  const normalized = `${canonicalPath}${resolved.search}${resolved.hash}`;
  return /^https?:\/\//.test(value) ? `${siteOrigin}${normalized}` : normalized;
};

for (const file of htmlFiles) {
  const relative = path.relative(outputDirectory, file).split(path.sep).join("/");
  const basePath = `/${relative}`;
  const source = await readFile(file, "utf8");
  const normalized = source.replace(
    /(\bhref=)(["'])([^"']+)\2/g,
    (match, attribute, quote, value) =>
      `${attribute}${quote}${normalizeLocalUrl(value, basePath)}${quote}`,
  );

  if (normalized !== source) await writeFile(file, normalized);
}

for (const file of files.filter((candidate) => candidate.endsWith(".xml"))) {
  const source = await readFile(file, "utf8");
  const normalized = source.replace(
    /https:\/\/talkingml\.com\/[^<\s"']*\.html(?:[?#][^<\s"']*)?/g,
    (value) => normalizeLocalUrl(value),
  );

  if (normalized !== source) await writeFile(file, normalized);
}

const normalizeJsonValue = (value) => {
  if (Array.isArray(value)) return value.map(normalizeJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalizeJsonValue(nested)]),
    );
  }
  return normalizeLocalUrl(value);
};

for (const file of files.filter((candidate) => candidate.endsWith(".json"))) {
  const source = await readFile(file, "utf8");
  const normalized = `${JSON.stringify(normalizeJsonValue(JSON.parse(source)), null, 2)}\n`;

  if (normalized !== source) await writeFile(file, normalized);
}
