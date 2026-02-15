#!/usr/bin/env node
import * as p from "@clack/prompts";
import pc from "picocolors";
import { runPrompts } from "./prompts.js";
import { scaffold } from "./scaffold.js";

async function main() {
  p.intro(pc.bgCyan(pc.black(" create-lunchtable-tcg ")));

  const projectName = process.argv[2];

  const config = await runPrompts(projectName);

  await scaffold(config);

  p.outro(pc.green("Happy building!"));
}

main().catch((err) => {
  p.log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
