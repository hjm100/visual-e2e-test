#!/usr/bin/env node
/**
 * 发包：校验或构建本机安装包 → npm run upload:cdn → 推送 master → 打 tag →
 * 用 gh 创建 GitHub Release 并上传资产（双传备份）。
 *
 * 发版前在本机准备：
 *   npm run download:chromium -- all
 *   已 export QINIU_ACCESS_KEY / QINIU_SECRET_KEY
 *
 * 用法: node scripts/pub.mjs
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCdnConfig, versionManifestUrl } from "./lib/cdn-config.mjs";
import {
  collectReleaseAssets,
  ReleaseAssetsError,
} from "./lib/release-assets.mjs";
import { readVersion } from "./lib/version.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DEFAULT_BRANCH = "master";
const TAG_PREFIX = "v";

function git(...args) {
  const r = spawnSync("git", args, { encoding: "utf-8", cwd: REPO_ROOT });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || "git failed").trim());
  }
  return (r.stdout || "").trim();
}

function run(cmd, args, inherit = true) {
  const r = spawnSync(cmd, args, {
    encoding: "utf-8",
    cwd: REPO_ROOT,
    stdio: inherit ? "inherit" : "pipe",
  });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || `${cmd} failed`).toString().trim());
  }
  return (r.stdout || "").trim();
}

function requireGh() {
  const r = spawnSync("gh", ["--version"], { encoding: "utf-8" });
  if (r.status !== 0) {
    throw new Error("需要 GitHub CLI (gh)，用于创建 Release 并上传安装包");
  }
}

function collectOrBuildReleaseAssets(version) {
  try {
    return collectReleaseAssets(version);
  } catch (err) {
    if (!(err instanceof ReleaseAssetsError)) throw err;
    console.warn(`${err.message}\n将自动构建当前版本的全部安装包…`);
    run("npm", ["run", "electron:build:all"]);
    return collectReleaseAssets(version);
  }
}

function main() {
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

  let assets;
  let cdnCfg;
  try {
    requireGh();
    cdnCfg = loadCdnConfig();
    assets = collectOrBuildReleaseAssets(version);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  console.log(`版本: ${version}`);
  console.log("安装包:");
  for (const a of assets) console.log(`  [${a.id}] ${a.path}`);

  console.log("上传 CDN（upload:cdn）…");
  try {
    run("node", ["scripts/upload-cdn.mjs"]);
  } catch (err) {
    console.error(`CDN 上传失败，已中止发版（未打 tag）: ${err.message || err}`);
    process.exit(1);
  }

  const manifestUrl = versionManifestUrl(cdnCfg, version);

  console.log(`推送 ${DEFAULT_BRANCH}…`);
  git("push", "origin", DEFAULT_BRANCH);

  console.log(`创建 tag ${tag}…`);
  git("tag", "-a", tag, "-m", `chore(release): publish ${tag}`);

  console.log(`推送 tag…`);
  git("push", "origin", tag);

  console.log(`创建 GitHub Release ${tag} 并上传资产（备份）…`);
  try {
    run("gh", [
      "release",
      "create",
      tag,
      ...assets.map((a) => a.path),
      "--title",
      tag,
      "--generate-notes",
      "--notes",
      [
        "## CDN downloads",
        "",
        `- Manifest: ${manifestUrl}`,
        `- CDN base: ${cdnCfg.domain}`,
        "",
        "GitHub assets are backups; the download site uses Qiniu CDN URLs.",
        "",
      ].join("\n"),
    ]);
  } catch (err) {
    console.error(err.message);
    console.error(
      `GitHub Release 失败，但 CDN 已可用: ${manifestUrl}\n可稍后执行: gh release create ${tag} ${assets.map((a) => a.path).join(" ")} --title ${tag}`,
    );
    process.exit(1);
  }

  console.log(`\n已发布 ${tag}（双传：七牛 CDN + GitHub Release 备份）。`);
  console.log(`CDN manifest: ${manifestUrl}`);
  console.log(`站点部署由 release 事件触发（若已配置 SITE_DEPLOY_TOKEN）。`);
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
