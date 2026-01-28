/**
 * Type Generator Script
 *
 * Generates TypeScript type definitions from Convex validators.
 * Run: bun run scripts/generate-types.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";

const VALIDATORS_PATH = "../convex/lib/returnValidators.ts";
const OUTPUT_PATH = "../apps/web/src/types/generated.ts";

interface ValidatorInfo {
  name: string;
  typeName: string;
}

/**
 * Parse validator exports from returnValidators.ts
 */
function parseValidators(content: string): ValidatorInfo[] {
  const validatorRegex = /export const (\w+Validator) = ([^;]+);/g;
  const validators: ValidatorInfo[] = [];
  let match;

  while ((match = validatorRegex.exec(content)) !== null) {
    const validatorName = match[1];
    const validatorValue = match[2];

    // Skip function validators (e.g., <T extends ...> or function declarations)
    if (validatorValue.includes("<") || validatorValue.includes("=>") || validatorValue.includes("function")) {
      console.log(`  ⚠ Skipping function validator: ${validatorName}`);
      continue;
    }

    // Convert "userProfileValidator" -> "UserProfile"
    const typeName = validatorName
      .replace(/Validator$/, "")
      .replace(/^(\w)/, (c) => c.toUpperCase())
      .replace(/([A-Z])/g, (c) => c.toUpperCase());

    validators.push({
      name: validatorName,
      typeName: capitalizeTypeName(validatorName.replace(/Validator$/, "")),
    });
  }

  return validators;
}

/**
 * Convert validator name to PascalCase type name
 * Examples:
 * - userProfileValidator -> UserProfile
 * - leaderboardEntryValidator -> LeaderboardEntry
 * - achievementValidator -> Achievement
 */
function capitalizeTypeName(name: string): string {
  // Handle camelCase to PascalCase
  return name
    .replace(/^(\w)/, (c) => c.toUpperCase())
    .replace(/_(\w)/g, (_, c) => c.toUpperCase());
}

/**
 * Generate type definitions from validators
 */
function generateTypes(validators: ValidatorInfo[]): string {
  const imports = `/**
 * AUTO-GENERATED - DO NOT EDIT
 * Generated from convex/lib/returnValidators.ts
 * Run: bun run generate:types
 *
 * This file contains all TypeScript types inferred from Convex validators.
 * Instead of manually writing \`Infer<typeof validator>\` in every file,
 * import the generated types directly from this file.
 */

import type { Infer } from "convex/values";
import type {
${validators.map(v => `  ${v.name},`).join("\n")}
} from "../../../../convex/lib/returnValidators";

`;

  const types = validators.map(v => {
    return `export type ${v.typeName} = Infer<typeof ${v.name}>;`;
  }).join("\n");

  return imports + types + "\n";
}

/**
 * Main execution
 */
async function main() {
  console.log("🔄 Generating types from validators...");

  const validatorsPath = path.join(__dirname, VALIDATORS_PATH);
  const outputPath = path.join(__dirname, OUTPUT_PATH);

  // Read validators file
  if (!fs.existsSync(validatorsPath)) {
    console.error(`❌ Error: Could not find ${validatorsPath}`);
    process.exit(1);
  }

  const validatorsContent = fs.readFileSync(validatorsPath, "utf-8");

  // Parse validators
  const validators = parseValidators(validatorsContent);
  console.log(`✓ Found ${validators.length} validators`);

  // Generate type definitions
  const typeDefinitions = generateTypes(validators);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output file
  fs.writeFileSync(outputPath, typeDefinitions);

  console.log(`✓ Generated types written to ${OUTPUT_PATH}`);
  console.log(`✓ Generated ${validators.length} type definitions`);
  console.log("\n📋 Generated types:");
  validators.forEach(v => {
    console.log(`  - ${v.typeName} (from ${v.name})`);
  });
}

main().catch((error) => {
  console.error("❌ Error generating types:", error);
  process.exit(1);
});
