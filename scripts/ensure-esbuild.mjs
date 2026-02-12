#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function getEsbuildBinaryPath(esbuildDir) {
  return process.platform === "win32"
    ? path.join(esbuildDir, "bin", "esbuild.exe")
    : path.join(esbuildDir, "bin", "esbuild");
}

function readBinaryVersion(binaryPath) {
  return execFileSync(binaryPath, ["--version"], { encoding: "utf8" }).trim();
}

function getPlatformPackageName() {
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  }
  if (process.platform === "linux") {
    return process.arch === "arm64" ? "linux-arm64" : "linux-x64";
  }
  if (process.platform === "win32") {
    return process.arch === "arm64" ? "win32-arm64" : "win32-x64";
  }
  return null;
}

function resolveEsbuildForCurrentApp() {
  const cwd = process.cwd();

  try {
    return require.resolve("esbuild/package.json", { paths: [cwd] });
  } catch {
    // continue
  }

  try {
    const astroPkgPath = require.resolve("astro/package.json", { paths: [cwd] });
    const astroRequire = createRequire(astroPkgPath);
    return astroRequire.resolve("esbuild/package.json");
  } catch {
    // continue
  }

  try {
    return require.resolve("esbuild/package.json");
  } catch {
    return null;
  }
}

function tryRepairFromPlatformPackage(expectedVersion, binaryPath) {
  const platformPackage = getPlatformPackageName();
  if (!platformPackage) {
    return false;
  }

  const repoRoot = path.resolve(import.meta.dirname, "..");
  const bunStoreRoot = path.join(repoRoot, "node_modules", ".bun");
  if (!existsSync(bunStoreRoot)) {
    return false;
  }

  const scopedPackageDir = readdirSync(bunStoreRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .find((entry) => entry.name === `@esbuild+${platformPackage}@${expectedVersion}`);

  if (!scopedPackageDir) {
    return false;
  }

  const sourceBinaryPath = path.join(
    bunStoreRoot,
    scopedPackageDir.name,
    "node_modules",
    "@esbuild",
    platformPackage,
    "bin",
    process.platform === "win32" ? "esbuild.exe" : "esbuild"
  );

  if (!existsSync(sourceBinaryPath)) {
    return false;
  }

  // Break hard links before copying to avoid cross-version corruption.
  unlinkSync(binaryPath);
  copyFileSync(sourceBinaryPath, binaryPath);
  if (process.platform !== "win32") {
    chmodSync(binaryPath, 0o755);
  }
  return true;
}

function reinstallBinary(installScriptPath) {
  execFileSync(process.execPath, [installScriptPath], { stdio: "inherit" });
}

function main() {
  const packageJsonPath = resolveEsbuildForCurrentApp();
  if (!packageJsonPath) {
    console.warn("[ensure-esbuild] esbuild package not found; skipping binary validation");
    return;
  }

  const esbuildDir = path.dirname(packageJsonPath);
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const expectedVersion = String(packageJson.version);
  const binaryPath = getEsbuildBinaryPath(esbuildDir);
  const installScriptPath = path.join(esbuildDir, "install.js");

  if (!existsSync(binaryPath) || !existsSync(installScriptPath)) {
    throw new Error("esbuild installation is incomplete");
  }

  const actualVersion = readBinaryVersion(binaryPath);
  if (actualVersion === expectedVersion) {
    return;
  }

  console.warn(
    `[ensure-esbuild] version mismatch detected (js=${expectedVersion}, binary=${actualVersion}). Reinstalling binary...`
  );

  const repairedFromPlatformPackage = tryRepairFromPlatformPackage(expectedVersion, binaryPath);
  if (!repairedFromPlatformPackage) {
    reinstallBinary(installScriptPath);
  }

  const repairedVersion = readBinaryVersion(binaryPath);
  if (repairedVersion !== expectedVersion) {
    throw new Error(
      `[ensure-esbuild] failed to repair esbuild binary (expected ${expectedVersion}, got ${repairedVersion})`
    );
  }
}

main();
