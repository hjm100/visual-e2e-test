#!/usr/bin/env node
import { syncPackageVersion } from "../lib/version.mjs";

const version = syncPackageVersion();
console.log(`版本: ${version}`);
