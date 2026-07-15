/**
 * Load Qiniu CDN config from config/cdn.qiniu.json.
 * accessKey / secretKey 只从环境变量 QINIU_ACCESS_KEY / QINIU_SECRET_KEY 读取。
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../dev/env.mjs";

const CONFIG_PATH = join(REPO_ROOT, "config", "cdn.qiniu.json");

const REGION_TO_ZONE = {
  z0: "Zone_z0",
  z1: "Zone_z1",
  z2: "Zone_z2",
  as0: "Zone_as0",
  na0: "Zone_na0",
  cn_east_2: "Zone_cn_east_2",
};

/**
 * @returns {{
 *   provider: string,
 *   accessKey: string,
 *   secretKey: string,
 *   bucket: string,
 *   region: string,
 *   domain: string,
 *   keyPrefix: string,
 *   upload: { overwriteLatest: boolean, retry: number },
 *   configPath: string,
 * }}
 */
export function loadCdnConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error("缺少 config/cdn.qiniu.json");
  }

  let raw;
  try {
    raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch (err) {
    throw new Error(`无法解析 CDN 配置: ${err.message}`);
  }

  const accessKey = (process.env.QINIU_ACCESS_KEY || "").trim();
  const secretKey = (process.env.QINIU_SECRET_KEY || "").trim();
  const bucket = String(raw.bucket || "").trim();
  const region = String(raw.region || "z0").trim();
  const domain = String(raw.domain || "")
    .trim()
    .replace(/\/$/, "");
  const keyPrefix = String(raw.keyPrefix || "releases")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  const upload = {
    overwriteLatest: raw.upload?.overwriteLatest !== false,
    retry: Math.max(1, Number(raw.upload?.retry) || 3),
  };

  const missing = [];
  if (!accessKey) missing.push("环境变量 QINIU_ACCESS_KEY");
  if (!secretKey) missing.push("环境变量 QINIU_SECRET_KEY");
  if (!bucket) missing.push("bucket");
  if (!domain) missing.push("domain");
  if (!/^https?:\/\//i.test(domain)) missing.push("domain（须为 http(s) URL）");
  if (missing.length) {
    throw new Error(`CDN 配置不完整: ${missing.join(", ")}`);
  }

  if (!REGION_TO_ZONE[region]) {
    throw new Error(
      `未知 region "${region}"，可选: ${Object.keys(REGION_TO_ZONE).join(", ")}`,
    );
  }

  return {
    provider: raw.provider || "qiniu",
    accessKey,
    secretKey,
    bucket,
    region,
    domain,
    keyPrefix,
    upload,
    configPath: CONFIG_PATH,
  };
}

export function zoneNameForRegion(region) {
  return REGION_TO_ZONE[region];
}

/** @param {string} domain @param {string} key */
export function publicObjectUrl(domain, key) {
  const base = domain.replace(/\/$/, "");
  const encoded = key
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base}/${encoded}`;
}

/** @param {{ keyPrefix: string, domain: string }} cfg @param {string} version */
export function versionManifestUrl(cfg, version) {
  const tag = version.startsWith("v") ? version : `v${version}`;
  const key = `${cfg.keyPrefix}/${tag}/manifest.json`;
  return publicObjectUrl(cfg.domain, key);
}
