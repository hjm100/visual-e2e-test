#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../dev/env.mjs";

const version = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf-8")).version;
console.log(`版本: ${version}`);
