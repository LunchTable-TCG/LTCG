#!/usr/bin/env bun
/**
 * Type Safety Check Script
 *
 * Scans the codebase for type safety issues and reports violations.
 * Run with: bun run scripts/type-safety-check.ts
 */

import { readdirSync, statSync, readFileSync, lstatSync } from "fs";
import { join } from "path";

interface TypeSafetyIssue {
  file: string;
  line: number;
  column: number;
  issue: string;
  severity: "error" | "warning";
}

const issues: TypeSafetyIssue[] = [];

// Configurable thresholds - Baseline established January 28, 2026
const THRESHOLDS = {
  maxAnyTypes: 400, // Target: reduce from 208
  maxTsIgnore: 60,  // Target: reduce from current level (use targeted @ts-expect-error instead of blanket suppressions)
  maxAsAny: 130,    // Target: reduce from 96
};

// Directories to scan
const SCAN_DIRS = ["apps", "convex"];

// Patterns to detect
const PATTERNS = {
  any: /:\s*any\b|<any>/g,
  tsIgnore: /@ts-ignore|@ts-expect-error|@ts-nocheck/g,
  asAny: /as\s+any\b/g,
  asUnknown: /as\s+unknown\b/g,
  nonNullAssertion: /!\s*[\.;,\)]/g,
};

// Files to ignore
const IGNORE_PATTERNS = [
  "_generated",
  "node_modules",
  ".next",
  "dist",
  "coverage",
  "playwright-report",
  ".turbo",
];

function shouldIgnoreFile(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function scanFile(filePath: string): void {
  if (shouldIgnoreFile(filePath)) return;

  if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) return;

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Check for 'any' types
    const anyMatches = line.matchAll(PATTERNS.any);
    for (const match of anyMatches) {
      // Skip if in comment
      if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

      issues.push({
        file: filePath,
        line: lineNumber,
        column: match.index || 0,
        issue: "Usage of 'any' type",
        severity: "error",
      });
    }

    // Check for @ts-ignore/@ts-expect-error
    const tsIgnoreMatches = line.matchAll(PATTERNS.tsIgnore);
    for (const match of tsIgnoreMatches) {
      issues.push({
        file: filePath,
        line: lineNumber,
        column: match.index || 0,
        issue: `Type suppression: ${match[0]}`,
        severity: "warning",
      });
    }

    // Check for 'as any'
    const asAnyMatches = line.matchAll(PATTERNS.asAny);
    for (const match of asAnyMatches) {
      if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

      issues.push({
        file: filePath,
        line: lineNumber,
        column: match.index || 0,
        issue: "Type assertion 'as any'",
        severity: "error",
      });
    }

    // Check for non-null assertions
    for (const match of line.matchAll(PATTERNS.nonNullAssertion)) {
      if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

      issues.push({
        file: filePath,
        line: lineNumber,
        column: match.index || 0,
        issue: "Non-null assertion operator '!'",
        severity: "warning",
      });
    }
  });
}

function scanDirectory(dirPath: string): void {
  if (shouldIgnoreFile(dirPath)) return;

  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);

    if (shouldIgnoreFile(fullPath)) continue;

    const lstat = lstatSync(fullPath);

    // Skip symlinks to avoid double-counting
    if (lstat.isSymbolicLink()) continue;

    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (stat.isFile()) {
      scanFile(fullPath);
    }
  }
}

function generateReport(): void {
  console.log("\n========================================");
  console.log("       Type Safety Check Report        ");
  console.log("========================================\n");

  const errorCount = issues.filter(i => i.severity === "error").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;

  // Group issues by type
  const anyTypes = issues.filter(i => i.issue === "Usage of 'any' type");
  const asAnyTypes = issues.filter(i => i.issue === "Type assertion 'as any'");
  const tsSuppressions = issues.filter(i => i.issue.startsWith("Type suppression"));
  const nonNullAssertions = issues.filter(i => i.issue.startsWith("Non-null assertion"));

  console.log("Summary:");
  console.log(`  Total Issues: ${issues.length}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Warnings: ${warningCount}\n`);

  console.log("Breakdown:");
  console.log(`  'any' types: ${anyTypes.length} (threshold: ${THRESHOLDS.maxAnyTypes})`);
  console.log(`  'as any' casts: ${asAnyTypes.length} (threshold: ${THRESHOLDS.maxAsAny})`);
  console.log(`  Type suppressions: ${tsSuppressions.length} (threshold: ${THRESHOLDS.maxTsIgnore})`);
  console.log(`  Non-null assertions: ${nonNullAssertions.length}\n`);

  // Check thresholds
  let failed = false;

  if (anyTypes.length > THRESHOLDS.maxAnyTypes) {
    console.error(`❌ FAILED: Too many 'any' types (${anyTypes.length} > ${THRESHOLDS.maxAnyTypes})`);
    failed = true;
  } else {
    console.log(`✅ PASSED: 'any' types within threshold`);
  }

  if (asAnyTypes.length > THRESHOLDS.maxAsAny) {
    console.error(`❌ FAILED: Too many 'as any' casts (${asAnyTypes.length} > ${THRESHOLDS.maxAsAny})`);
    failed = true;
  } else {
    console.log(`✅ PASSED: 'as any' casts within threshold`);
  }

  if (tsSuppressions.length > THRESHOLDS.maxTsIgnore) {
    console.error(`❌ FAILED: Too many type suppressions (${tsSuppressions.length} > ${THRESHOLDS.maxTsIgnore})`);
    failed = true;
  } else {
    console.log(`✅ PASSED: Type suppressions within threshold`);
  }

  // Show top offenders
  if (issues.length > 0) {
    console.log("\n----------------------------------------");
    console.log("Top 10 Files with Issues:");
    console.log("----------------------------------------");

    const fileIssueCount = new Map<string, number>();
    issues.forEach(issue => {
      const count = fileIssueCount.get(issue.file) || 0;
      fileIssueCount.set(issue.file, count + 1);
    });

    const sortedFiles = Array.from(fileIssueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sortedFiles.forEach(([file, count]) => {
      console.log(`  ${count.toString().padStart(3)} issues - ${file}`);
    });
  }

  console.log("\n========================================\n");

  if (failed) {
    console.error("Type safety check FAILED. Please review and fix issues.");
    process.exit(1);
  } else {
    console.log("✅ Type safety check PASSED!");
    process.exit(0);
  }
}

function main(): void {
  console.log("Scanning codebase for type safety issues...\n");

  for (const dir of SCAN_DIRS) {
    try {
      scanDirectory(dir);
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
  }

  generateReport();
}

main();
