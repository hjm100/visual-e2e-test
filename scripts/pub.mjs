#!/usr/bin/env node
/**
 * 发包：推送 main，打 tag v{VERSION} 并推送，触发 CI 编译。
 *
 * 用法: node scripts/pub.mjs
 */
import { spawnSync } from "node:child_process";
import { readVersion } from "./lib/version.mjs";

const DEFAULT_BRANCH = "main";
const TAG_PREFIX = "v";

function git(...args) {
  const r = spawnSync("git", args, { encoding: "utf-8" });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || "git failed").trim());
  }
  return (r.stdout || "").trim();
}

const current = git("rev-parse", "--abbrev-ref", "HEAD");
if (current !== DEFAULT_BRANCH) {
  console.error(`请在 ${DEFAULT_BRANCH} 分支执行 pub（当前: ${current}）`);
  process.exit(1);
}

const dirty = git("status", "--porcelain");
if (dirty) {
  console.error("工作区有未提交改动，请先提交或 stash");
  process.exit(1);
}

const version = readVersion();
const tag = `${TAG_PREFIX}${version}`;

if (git("tag", "--list", tag)) {
  console.error(`tag ${tag} 已存在`);
  process.exit(1);
}

console.log(`版本: ${version}`);
console.log(`推送 ${DEFAULT_BRANCH}…`);
git("push", "origin", DEFAULT_BRANCH);

console.log(`创建 tag ${tag}…`);
git("tag", "-a", tag, "-m", `chore(release): publish ${tag}`);

console.log(`推送 tag…`);
git("push", "origin", tag);

console.log(`\n已发布 ${tag}，CI 将自动构建安装包。`);
