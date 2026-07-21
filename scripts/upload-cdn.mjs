#!/usr/bin/env node
/**
 * 将本机安装包上传到七牛 CDN（版本取自 version.js）。
 * 须已 export QINIU_ACCESS_KEY / QINIU_SECRET_KEY；config/cdn.qiniu.json 提供 bucket/domain 等。
 * 若该版本 manifest 已存在则跳过；加 --force 强制重传。
 *
 * 用法:
 *   npm run upload:cdn
 *   npm run upload:cdn -- --force
 */
import { collectReleaseAssets } from "./lib/release-assets.mjs";
import { uploadReleaseToQiniu } from "./lib/qiniu-upload.mjs";
import { readVersion } from "./lib/version.mjs";

const force = process.argv.includes("--force");

async function main() {
  const version = readVersion();
  const assets = collectReleaseAssets(version);

  console.log(`版本: ${version}${force ? " (--force)" : ""}`);
  console.log("安装包:");
  for (const a of assets) console.log(`  [${a.id}] ${a.path}`);

  const result = await uploadReleaseToQiniu(version, assets, { force });
  console.log(
    result.skipped
      ? `\n已跳过上传。CDN manifest: ${result.manifestUrl}`
      : `\n上传完成。CDN manifest: ${result.manifestUrl}`,
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
