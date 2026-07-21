import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, test } from "node:test";
import {
  collectReleaseAssets,
  ReleaseAssetsError,
} from "./release-assets.mjs";

const tempRoots = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function createBuild(files) {
  const root = mkdtempSync(join(tmpdir(), "visual-e2e-release-assets-"));
  tempRoots.push(root);

  for (const [dir, names] of Object.entries(files)) {
    const outputDir = join(root, dir);
    mkdirSync(outputDir, { recursive: true });
    for (const name of names) {
      writeFileSync(join(outputDir, name), "");
    }
  }
  return root;
}

test("collects exactly one installer for the current version per platform", () => {
  const root = createBuild({
    "build/macos-arm64": ["Visual.E2E.Test-1.3.0-arm64.dmg"],
    "build/macos-x64": ["Visual.E2E.Test-1.3.0.dmg"],
    "build/windows": ["Visual.E2E.Test.Setup.1.3.0.exe"],
  });

  const assets = collectReleaseAssets("1.3.0", root);

  assert.deepEqual(
    assets.map(({ id, path }) => ({ id, filename: basename(path) })),
    [
      { id: "mac-arm64", filename: "Visual.E2E.Test-1.3.0-arm64.dmg" },
      { id: "mac-x64", filename: "Visual.E2E.Test-1.3.0.dmg" },
      { id: "win", filename: "Visual.E2E.Test.Setup.1.3.0.exe" },
    ],
  );
});

test("rejects an installer built for an older version", () => {
  const root = createBuild({
    "build/macos-arm64": ["Visual.E2E.Test-1.2.0-arm64.dmg"],
    "build/macos-x64": ["Visual.E2E.Test-1.3.0.dmg"],
    "build/windows": ["Visual.E2E.Test.Setup.1.3.0.exe"],
  });

  assert.throws(
    () => collectReleaseAssets("1.3.0", root),
    (error) =>
      error instanceof ReleaseAssetsError &&
      error.message.includes("Visual.E2E.Test-1.2.0-arm64.dmg"),
  );
});

test("rejects multiple installers for the same platform", () => {
  const root = createBuild({
    "build/macos-arm64": [
      "Visual.E2E.Test-1.3.0-arm64.dmg",
      "Visual.E2E.Test-1.2.0-arm64.dmg",
    ],
    "build/macos-x64": ["Visual.E2E.Test-1.3.0.dmg"],
    "build/windows": ["Visual.E2E.Test.Setup.1.3.0.exe"],
  });

  assert.throws(
    () => collectReleaseAssets("1.3.0", root),
    ReleaseAssetsError,
  );
});
