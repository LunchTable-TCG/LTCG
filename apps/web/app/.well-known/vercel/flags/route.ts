import { NextResponse } from "next/server";
import { type ApiData } from "flags";
import { FLAG_DEFAULTS, type AppFeatureFlags } from "@/lib/flags";

/**
 * Vercel Flags Explorer Endpoint
 *
 * This endpoint enables the Vercel Toolbar Flags Explorer to discover
 * and display feature flags available in the application.
 *
 * See: https://vercel.com/docs/workflow-collaboration/feature-flags/using-vercel-toolbar
 */

/**
 * Flag definitions for the Vercel Flags Explorer
 */
const flagDefinitions: ApiData["definitions"] = {
  maintenanceMode: {
    description: "Enable maintenance mode across the app",
    origin: "https://app.hypertune.com",
    options: [
      { value: false, label: "Disabled" },
      { value: true, label: "Enabled" },
    ],
  },
  storyModeEnabled: {
    description: "Enable story mode gameplay",
    origin: "https://app.hypertune.com",
    options: [
      { value: false, label: "Disabled" },
      { value: true, label: "Enabled" },
    ],
  },
  marketplaceEnabled: {
    description: "Enable marketplace/trading features",
    origin: "https://app.hypertune.com",
    options: [
      { value: false, label: "Disabled" },
      { value: true, label: "Enabled" },
    ],
  },
  rankedEnabled: {
    description: "Enable ranked matches",
    origin: "https://app.hypertune.com",
    options: [
      { value: false, label: "Disabled" },
      { value: true, label: "Enabled" },
    ],
  },
  aiOpponentsEnabled: {
    description: "Enable AI opponents",
    origin: "https://app.hypertune.com",
    options: [
      { value: false, label: "Disabled" },
      { value: true, label: "Enabled" },
    ],
  },
  maxConcurrentGames: {
    description: "Maximum concurrent games per user",
    origin: "https://app.hypertune.com",
    options: [
      { value: 1, label: "1 game" },
      { value: 3, label: "3 games" },
      { value: 5, label: "5 games" },
      { value: 10, label: "10 games" },
    ],
  },
  newPackAnimation: {
    description: "Enable new pack opening animation",
    origin: "https://app.hypertune.com",
    options: [
      { value: false, label: "Disabled" },
      { value: true, label: "Enabled" },
    ],
  },
};

export async function GET() {
  const data: ApiData = {
    definitions: flagDefinitions,
    hints: [
      {
        key: "environment",
        text: process.env.NODE_ENV === "production" ? "Production" : "Development",
      },
    ],
  };

  return NextResponse.json(data);
}
