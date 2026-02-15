import * as p from "@clack/prompts";
import pc from "picocolors";

export interface ScaffoldConfig {
  projectName: string;
  tier: "starter" | "standard" | "full";
  gameName: string;
  primaryColor: string;
  includeBlockchain: boolean;
  includeAI: boolean;
  cardCsvPath?: string;
}

const SLUG_REGEX = /^[a-z][a-z0-9-]*$/;

export async function runPrompts(initialName?: string) {
  const projectName = initialName ?? (await p.text({
    message: "Project name",
    placeholder: "my-card-game",
    validate(value) {
      if (!value) return "Project name is required.";
      if (!SLUG_REGEX.test(value)) {
        return "Must be lowercase, no spaces (e.g. my-card-game).";
      }
    },
  }));

  if (p.isCancel(projectName)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const tier = await p.select({
    message: "Select a tier",
    options: [
      {
        value: "starter" as const,
        label: "Starter",
        hint: "Card game only",
      },
      {
        value: "standard" as const,
        label: "Standard",
        hint: "+ economy, progression, competitive",
      },
      {
        value: "full" as const,
        label: "Full",
        hint: "All components",
      },
    ],
  });

  if (p.isCancel(tier)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const gameName = await p.text({
    message: "Game name",
    placeholder: "My Card Game",
    validate(value) {
      if (!value) return "Game name is required.";
    },
  });

  if (p.isCancel(gameName)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const primaryColor = await p.text({
    message: "Primary color (hex)",
    placeholder: "#6366f1",
    defaultValue: "#6366f1",
    validate(value) {
      if (value && !/^#[0-9a-fA-F]{6}$/.test(value)) {
        return "Must be a valid hex color (e.g. #6366f1).";
      }
    },
  });

  if (p.isCancel(primaryColor)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const includeBlockchain = await p.confirm({
    message: "Include blockchain support?",
    initialValue: false,
  });

  if (p.isCancel(includeBlockchain)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const includeAI = await p.confirm({
    message: "Include AI agents?",
    initialValue: false,
  });

  if (p.isCancel(includeAI)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const hasCardCsv = await p.confirm({
    message: "Import cards from a CSV file?",
    initialValue: false,
  });

  if (p.isCancel(hasCardCsv)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  let cardCsvPath: string | undefined;

  if (hasCardCsv) {
    const csvPath = await p.text({
      message: "Path to card CSV file",
      placeholder: "./cards.csv",
      validate(value) {
        if (!value) return "File path is required.";
      },
    });

    if (p.isCancel(csvPath)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    cardCsvPath = csvPath as string;
  }

  const config: ScaffoldConfig = {
    projectName: projectName as string,
    tier: tier as ScaffoldConfig["tier"],
    gameName: gameName as string,
    primaryColor: (primaryColor as string) || "#6366f1",
    includeBlockchain: includeBlockchain as boolean,
    includeAI: includeAI as boolean,
    cardCsvPath,
  };

  p.note(
    [
      `${pc.bold("Project:")}    ${config.projectName}`,
      `${pc.bold("Tier:")}       ${config.tier}`,
      `${pc.bold("Game:")}       ${config.gameName}`,
      `${pc.bold("Color:")}      ${config.primaryColor}`,
      `${pc.bold("Blockchain:")} ${config.includeBlockchain ? "yes" : "no"}`,
      `${pc.bold("AI Agents:")}  ${config.includeAI ? "yes" : "no"}`,
      `${pc.bold("Card CSV:")}   ${config.cardCsvPath ?? "none (using starter cards)"}`,
    ].join("\n"),
    "Configuration"
  );

  return config;
}
