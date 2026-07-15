/**
 * Upload release assets to Qiniu and write version + latest manifests.
 */
import { createHash } from "node:crypto";
import {
  createReadStream,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import qiniu from "qiniu";
import {
  loadCdnConfig,
  publicObjectUrl,
  versionManifestUrl,
} from "./cdn-config.mjs";

/**
 * @typedef {{ path: string, id: "mac-arm64" | "mac-x64" | "win" }} ReleaseAsset
 */

async function sha256File(filePath) {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {ReturnType<typeof loadCdnConfig>} cfg
 * @param {string} key
 * @param {string} localPath
 */
async function putFile(cfg, key, localPath) {
  const mac = new qiniu.auth.digest.Mac(cfg.accessKey, cfg.secretKey);
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: `${cfg.bucket}:${key}`,
  });
  const uploadToken = putPolicy.uploadToken(mac);

  const conf = makeQiniuConfig(cfg);

  const resumeUploader = new qiniu.resume_up.ResumeUploader(conf);
  const putExtra = qiniu.resume_up.PutExtra.create();
  putExtra.version = "v2";
  putExtra.fname = basename(localPath);

  let lastErr;
  for (let attempt = 1; attempt <= cfg.upload.retry; attempt++) {
    try {
      const { data, resp } = await resumeUploader.putFileV2(
        uploadToken,
        key,
        localPath,
        putExtra,
      );
      if (resp.statusCode === 200) return data;
      const hint =
        resp.statusCode === 631
          ? `（631=空间不存在，请核对 bucket=${cfg.bucket} / region=${cfg.region}）`
          : "";
      lastErr = new Error(
        `七牛上传失败 HTTP ${resp.statusCode} key=${key}${hint}: ${JSON.stringify(data)}`,
      );
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < cfg.upload.retry) {
      console.warn(`[CDN] 重试 ${attempt}/${cfg.upload.retry}: ${key}`);
      await sleep(1000 * attempt);
    }
  }
  throw lastErr;
}

async function putJson(cfg, key, obj) {
  const tmp = join(
    tmpdir(),
    `ve2e-${basename(key).replace(/\W+/g, "_")}-${Date.now()}.json`,
  );
  writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`, "utf-8");
  try {
    await putFile(cfg, key, tmp);
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function makeQiniuConfig(cfg) {
  const conf = new qiniu.conf.Config({
    useHttpsDomain: true,
    regionsProvider: qiniu.httpc.Region.fromRegionId(cfg.region),
  });
  return conf;
}

function versionPrefix(cfg, version) {
  const tag = version.startsWith("v") ? version : `v${version}`;
  return { tag, versionPlain: tag.replace(/^v/, ""), prefix: `${cfg.keyPrefix}/${tag}` };
}

/**
 * Whether releases/v{version}/manifest.json already exists (public URL probe).
 * 无法访问域名时视为不存在，继续上传。
 */
export async function versionExistsOnCdn(version) {
  const cfg = loadCdnConfig();
  const manifestUrl = versionManifestUrl(cfg, version);

  try {
    const head = await fetch(manifestUrl, { method: "HEAD", redirect: "follow" });
    if (head.ok) return true;
    if (head.status === 404 || head.status === 403) return false;

    if (head.status === 405 || head.status === 400) {
      const get = await fetch(manifestUrl, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        redirect: "follow",
      });
      if (get.ok || get.status === 206) return true;
      if (get.status === 404 || get.status === 403) return false;
    }
  } catch (err) {
    console.warn(
      `[CDN] 探测 manifest 失败（将继续上传）: ${manifestUrl} — ${err.message || err}`,
    );
  }
  return false;
}

/**
 * Upload installer files + manifests. Returns CDN manifest + URLs.
 * Skips upload when the version manifest already exists (unless force).
 *
 * @param {string} version semver without required v prefix
 * @param {ReleaseAsset[]} assets
 * @param {{ force?: boolean }} [options]
 */
export async function uploadReleaseToQiniu(version, assets, options = {}) {
  const force = options.force === true;
  const cfg = loadCdnConfig();
  const { tag, versionPlain, prefix } = versionPrefix(cfg, version);
  const manifestUrl = versionManifestUrl(cfg, versionPlain);

  if (!force && (await versionExistsOnCdn(versionPlain))) {
    console.log(`[CDN] ${tag} 已存在（${manifestUrl}），跳过上传`);
    return {
      cfg,
      tag,
      version: versionPlain,
      manifest: null,
      manifestUrl,
      cdnBase: cfg.domain,
      skipped: true,
    };
  }

  const publishedAt = new Date().toISOString();

  /** @type {Record<string, { filename: string, url: string, sha256: string, size: number }>} */
  const assetMap = {};
  const checksumLines = [];

  console.log(`[CDN] 上传到七牛 bucket=${cfg.bucket} prefix=${prefix}`);

  for (const { path: filePath, id } of assets) {
    const filename = basename(filePath);
    const key = `${prefix}/${filename}`;
    const size = statSync(filePath).size;
    console.log(`[CDN] 计算 SHA256: ${filename}`);
    const sha256 = await sha256File(filePath);
    console.log(`[CDN] 上传 ${filename} (${size} bytes)…`);
    await putFile(cfg, key, filePath);
    const url = publicObjectUrl(cfg.domain, key);
    assetMap[id] = { filename, url, sha256, size };
    checksumLines.push(`${sha256}  ${filename}`);
  }

  const checksumsPath = join(tmpdir(), `ve2e-SHA256SUMS-${Date.now()}.txt`);
  writeFileSync(checksumsPath, `${checksumLines.join("\n")}\n`, "utf-8");
  try {
    await putFile(cfg, `${prefix}/SHA256SUMS.txt`, checksumsPath);
  } finally {
    try {
      unlinkSync(checksumsPath);
    } catch {
      /* ignore */
    }
  }

  const manifest = {
    version: versionPlain,
    tag,
    publishedAt,
    assets: assetMap,
  };

  await putJson(cfg, `${prefix}/manifest.json`, manifest);

  if (cfg.upload.overwriteLatest) {
    await putJson(cfg, `${cfg.keyPrefix}/latest.json`, {
      ...manifest,
      manifestUrl: publicObjectUrl(cfg.domain, `${prefix}/manifest.json`),
    });
  }

  console.log(`[CDN] 完成 manifest: ${manifestUrl}`);

  return {
    cfg,
    tag,
    version: versionPlain,
    manifest,
    manifestUrl,
    cdnBase: cfg.domain,
    skipped: false,
  };
}
