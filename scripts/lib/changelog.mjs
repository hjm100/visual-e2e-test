import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../dev/env.mjs";

const GITHUB_REPO = "visual-e2e/visual-e2e-test";
const TAG_PREFIX = "v";

const HEADER = `# Changelog

All notable changes to this project will be documented in this file.
`;

function tag(version) {
  return `${TAG_PREFIX}${version}`;
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(date);
}

function compareUrl(fromVer, toVer) {
  return `https://github.com/${GITHUB_REPO}/compare/${tag(fromVer)}...${tag(toVer)}`;
}

function buildEntry(fromVer, toVer, date = formatDate()) {
  return `## [${toVer}](${compareUrl(fromVer, toVer)}) (${date})\n\n`;
}

export function bumpChangelog(fromVer, toVer) {
  const file = join(REPO_ROOT, "CHANGELOG.md");
  let content = existsSync(file) ? readFileSync(file, "utf-8") : `${HEADER}\n`;
  const entry = buildEntry(fromVer, toVer);

  const firstSection = content.indexOf("\n## ");
  if (firstSection === -1) {
    content = `${content.trimEnd()}\n\n${entry}`;
  } else {
    content = `${content.slice(0, firstSection + 1)}\n${entry}${content.slice(firstSection + 1)}`;
  }

  writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`, "utf-8");
}
