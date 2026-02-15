import path from "node:path";
import * as p from "@clack/prompts";
import fse from "fs-extra";
import pc from "picocolors";
import type { ScaffoldConfig } from "./prompts.js";
import { parseCardCSV } from "./csv-import.js";
import {
  generateCardData,
  generateConvexConfig,
  generateEnvExample,
  generateGameConfig,
  generatePackageJson,
  generateSeedFile,
  generateStarterCards,
  generateTsConfig,
} from "./templates.js";

export async function scaffold(config: ScaffoldConfig) {
  const targetDir = path.resolve(process.cwd(), config.projectName);

  if (await fse.pathExists(targetDir)) {
    p.log.error(`Directory ${pc.bold(config.projectName)} already exists.`);
    process.exit(1);
  }

  const s = p.spinner();
  s.start("Scaffolding project...");

  // Create directory structure
  await fse.ensureDir(path.join(targetDir, "convex"));
  await fse.ensureDir(path.join(targetDir, "src", "cards"));
  await fse.ensureDir(path.join(targetDir, "src", "config"));

  // Parse CSV if provided
  let csvData;
  if (config.cardCsvPath) {
    try {
      const resolvedPath = path.resolve(process.cwd(), config.cardCsvPath);
      csvData = parseCardCSV(resolvedPath);
    } catch (err) {
      s.stop("CSV import failed");
      p.log.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }

  // Write files
  const files: Array<[string, string]> = [
    ["package.json", generatePackageJson(config)],
    ["convex/convex.config.ts", generateConvexConfig(config)],
    ["src/cards/starter-set.ts", generateStarterCards()],
    ["src/config/game.ts", generateGameConfig(config)],
    [".env.example", generateEnvExample()],
    ["tsconfig.json", generateTsConfig()],
    ["convex/seed.ts", generateSeedFile(!!csvData)],
  ];

  if (csvData) {
    files.push(["convex/cardData.ts", generateCardData(csvData)]);
  }

  for (const [filePath, content] of files) {
    await fse.writeFile(path.join(targetDir, filePath), content, "utf-8");
  }

  s.stop("Project scaffolded!");

  // Success message
  const steps = [
    `cd ${config.projectName}`,
    "bun install",
    "npx convex dev",
    "bun run dev",
  ];

  p.note(steps.map((step, i) => `${pc.dim(`${i + 1}.`)} ${pc.cyan(step)}`).join("\n"), "Next steps");

  const tierLabel =
    config.tier === "starter"
      ? "Starter"
      : config.tier === "standard"
        ? "Standard"
        : "Full";

  p.log.info(
    `${pc.bold(config.gameName)} created with the ${pc.green(tierLabel)} tier.`
  );

  if (config.includeBlockchain) {
    p.log.info(`Blockchain support included (${pc.yellow("@lunchtable-tcg/token")}, ${pc.yellow("@lunchtable-tcg/treasury")}).`);
  }

  if (config.includeAI) {
    p.log.info(`AI agents included (${pc.yellow("@lunchtable-tcg/ai")}).`);
  }

  if (csvData) {
    p.log.info(
      `Card set imported: ${pc.green(String(csvData.cards.length))} cards, ${pc.green(String(csvData.decks.length))} starter decks.`
    );
    p.log.info(`Run ${pc.cyan("npx convex run seed:seedAll")} after setup to populate your database.`);
  }
}
