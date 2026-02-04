#!/usr/bin/env node

/**
 * Migration script to update mutation and internalMutation imports
 * to use trigger-wrapped versions from functions.ts
 *
 * This script updates all Convex TypeScript files to import mutation/internalMutation
 * from the wrapped versions in functions.ts instead of directly from _generated/server.
 *
 * Usage:
 *   node scripts/migrate-mutation-imports.js          # Dry run
 *   node scripts/migrate-mutation-imports.js --apply  # Apply changes
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, relative, sep } from "path";

const DRY_RUN = !process.argv.includes("--apply");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

const stats = {
  totalFiles: 0,
  updatedFiles: 0,
  skippedFiles: 0,
  errorFiles: 0,
};

/**
 * Calculate the relative path from a file to functions.ts
 */
function getFunctionsImportPath(filePath) {
  // Remove 'convex/' prefix
  const relativePath = filePath.replace(/^convex\//, "");

  // Count directory separators to determine depth
  const depth = (relativePath.match(/\//g) || []).length;

  if (depth === 0) {
    return "./functions";
  } else if (depth === 1) {
    return "../functions";
  } else if (depth === 2) {
    return "../../functions";
  } else if (depth === 3) {
    return "../../../functions";
  }

  // For deeper nesting, calculate dynamically
  return "../".repeat(depth) + "functions";
}

/**
 * Recursively find all TypeScript files in a directory
 */
function findTsFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skip _generated and node_modules
      if (file !== "_generated" && file !== "node_modules") {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Parse import statement to extract imported items
 */
function parseImports(importLine) {
  // Match: import { ... } from "..."
  const match = importLine.match(/import\s*{\s*([^}]+)\s*}\s*from\s*["']([^"']+)["']/);

  if (!match) {
    return null;
  }

  const [, importItems, source] = match;

  // Split by comma and clean up whitespace
  const items = importItems
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  // Separate type imports from value imports
  const types = [];
  const values = [];

  for (const item of items) {
    if (item.startsWith("type ")) {
      types.push(item.replace(/^type\s+/, ""));
    } else {
      values.push(item);
    }
  }

  return { types, values, source };
}

/**
 * Update a single file's imports
 */
function updateFile(filePath) {
  stats.totalFiles++;

  const relativePath = relative(".", filePath);
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Find import lines from _generated/server
  const importLineIndices = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("from") && lines[i].includes("_generated/server")) {
      importLineIndices.push(i);
    }
  }

  if (importLineIndices.length === 0) {
    return; // No _generated/server imports
  }

  let hasMutation = false;
  let hasInternalMutation = false;
  let otherImports = [];
  let typeImports = [];
  let firstImportLineIndex = importLineIndices[0];

  // Process each import line
  let importSource = "";
  for (const idx of importLineIndices) {
    const line = lines[idx];
    const parsed = parseImports(line);

    if (!parsed) continue;

    const { types, values, source } = parsed;
    importSource = source; // Save the import source

    // Check for mutation imports
    for (const value of values) {
      if (value === "mutation") {
        hasMutation = true;
      } else if (value === "internalMutation") {
        hasInternalMutation = true;
      } else {
        otherImports.push(value);
      }
    }

    // Keep type imports
    typeImports.push(...types);
  }

  // If no mutation imports, skip this file
  if (!hasMutation && !hasInternalMutation) {
    return;
  }

  console.log(`\n${colors.blue}Processing:${colors.reset} ${relativePath}`);
  console.log(`  ${colors.yellow}→ Imports mutation: ${hasMutation}${colors.reset}`);
  console.log(`  ${colors.yellow}→ Imports internalMutation: ${hasInternalMutation}${colors.reset}`);

  // Calculate the path to functions.ts
  const functionsPath = getFunctionsImportPath(relativePath);
  console.log(`  ${colors.yellow}→ Functions path: ${functionsPath}${colors.reset}`);

  // Build new import lines
  const newImportLines = [];

  // Import from _generated/server (if there are other imports)
  const allOtherImports = [...new Set([...otherImports, ...typeImports.map((t) => `type ${t}`)])];
  if (allOtherImports.length > 0) {
    newImportLines.push(`import { ${allOtherImports.join(", ")} } from "${importSource}";`);
  }

  // Import from functions.ts
  const mutationImports = [];
  if (hasMutation) mutationImports.push("mutation");
  if (hasInternalMutation) mutationImports.push("internalMutation");

  if (mutationImports.length > 0) {
    newImportLines.push(`import { ${mutationImports.join(", ")} } from "${functionsPath}";`);
  }

  // Replace the import lines
  const newLines = [...lines];

  // Remove all old import lines (in reverse order to maintain indices)
  for (let i = importLineIndices.length - 1; i >= 0; i--) {
    newLines.splice(importLineIndices[i], 1);
  }

  // Insert new import lines at the position of the first old import
  newLines.splice(firstImportLineIndex, 0, ...newImportLines);

  const newContent = newLines.join("\n");

  if (DRY_RUN) {
    console.log(`  ${colors.green}→ Would update (dry run)${colors.reset}`);
    stats.updatedFiles++;
  } else {
    try {
      writeFileSync(filePath, newContent, "utf-8");
      console.log(`  ${colors.green}→ Updated successfully${colors.reset}`);
      stats.updatedFiles++;
    } catch (error) {
      console.log(`  ${colors.red}→ Error: ${error.message}${colors.reset}`);
      stats.errorFiles++;
    }
  }
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.bright}${colors.blue}Mutation Import Migration${colors.reset}\n`);

  if (DRY_RUN) {
    console.log(`${colors.yellow}Running in DRY RUN mode (no files will be modified)${colors.reset}`);
    console.log(`${colors.yellow}Use --apply flag to apply changes${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bright}APPLYING CHANGES${colors.reset}\n`);
  }

  // Find all TypeScript files in convex/
  const files = findTsFiles("convex");

  console.log(`Found ${files.length} TypeScript files in convex/\n`);

  // Process each file
  for (const file of files) {
    try {
      updateFile(file);
    } catch (error) {
      console.log(`${colors.red}Error processing ${file}: ${error.message}${colors.reset}`);
      stats.errorFiles++;
    }
  }

  // Print summary
  console.log(`\n${colors.bright}${colors.blue}Migration Summary:${colors.reset}`);
  console.log(`Total files scanned: ${stats.totalFiles}`);
  console.log(`Files updated: ${colors.green}${stats.updatedFiles}${colors.reset}`);
  console.log(`Files with errors: ${colors.red}${stats.errorFiles}${colors.reset}`);
  console.log(`Files skipped: ${stats.skippedFiles}`);

  if (DRY_RUN && stats.updatedFiles > 0) {
    console.log(`\n${colors.yellow}To apply these changes, run:${colors.reset}`);
    console.log(`${colors.bright}node scripts/migrate-mutation-imports.js --apply${colors.reset}`);
  }
}

main();
