/**
 * Interactive Setup Wizard
 *
 * Guides users through first-time setup of the LTCG admin system.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

function printHeader() {
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║                                                      ║");
  console.log("║        🎮 LTCG Admin Setup Wizard 🎮                ║");
  console.log("║                                                      ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("\n");
}

function printStep(step: number, total: number, message: string) {
  console.log(`\n[${step}/${total}] ${message}`);
  console.log("─".repeat(60));
}

async function runCommand(command: string, description: string) {
  console.log(`\n▶️  ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error);
    return false;
  }
}

async function checkConvexDeployment() {
  try {
    const { stdout } = await execAsync("npx convex env get CONVEX_DEPLOYMENT");
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function main() {
  printHeader();

  console.log("This wizard will help you set up the LTCG admin system.");
  console.log("The process takes about 2-3 minutes.\n");

  const totalSteps = 6;
  let currentStep = 1;

  // Step 1: Check prerequisites
  printStep(currentStep++, totalSteps, "Checking prerequisites");
  console.log("Checking Node.js/Bun installation...");
  try {
    const { stdout } = await execAsync("bun --version");
    console.log(`✅ Bun ${stdout.trim()} detected`);
  } catch {
    console.log("❌ Bun not found. Please install Bun first:");
    console.log("   curl -fsSL https://bun.sh/install | bash");
    process.exit(1);
  }

  console.log("\nChecking Convex CLI...");
  try {
    const { stdout } = await execAsync("npx convex --version");
    console.log(`✅ Convex CLI detected`);
  } catch {
    console.log("❌ Convex CLI not found. Installing...");
    await runCommand("bun install convex", "Install Convex CLI");
  }

  // Step 2: Environment validation
  printStep(currentStep++, totalSteps, "Validating environment");
  const envValid = await runCommand("bun run validate:env", "Check environment variables");
  if (!envValid) {
    console.log("\n⚠️  Environment validation failed.");
    console.log("Please configure your .env.local file and try again.");
    console.log("\nSee SETUP.md for detailed instructions.");
    process.exit(1);
  }

  // Step 3: Check Convex deployment
  printStep(currentStep++, totalSteps, "Checking Convex deployment");
  const hasDeployment = await checkConvexDeployment();
  if (!hasDeployment) {
    console.log("⚠️  No Convex deployment detected.");
    console.log("\nYou need to deploy Convex first:");
    console.log("  1. Run: npx convex dev");
    console.log("  2. Follow the prompts to create a deployment");
    console.log("  3. Re-run this wizard\n");
    process.exit(1);
  }
  console.log("✅ Convex deployment configured");

  // Step 4: Run complete setup
  printStep(currentStep++, totalSteps, "Running complete setup");
  console.log("This will seed all configurations, cards, story content, etc.");
  console.log("Estimated time: 30-60 seconds\n");

  const setupSuccess = await runCommand(
    "npx convex run setup:setupComplete --prod",
    "Complete system setup"
  );

  if (!setupSuccess) {
    console.log("\n❌ Setup failed. Please check the error above.");
    console.log("You can try running individual setup steps:");
    console.log("  - bun run setup:quick    (quick setup for dev)");
    console.log("  - bun run seed:cards     (seed only cards)");
    console.log("  - bun run seed:configs   (seed only configs)");
    process.exit(1);
  }

  // Step 5: Verify setup
  printStep(currentStep++, totalSteps, "Verifying setup");
  await runCommand("npx convex run setup:checkSetupStatus", "Check setup status");

  // Step 6: Next steps
  printStep(currentStep++, totalSteps, "Setup complete!");
  console.log("\n🎉 Congratulations! Your LTCG admin system is set up.\n");

  console.log("📝 Next Steps:\n");
  console.log("1. Create your superadmin account:");
  console.log("   Get your Privy user ID from:");
  console.log("   - https://dashboard.privy.io/users");
  console.log("   - Or by logging in and checking the user details\n");
  console.log("   Then run:");
  console.log('   bun run setup:superadmin --privyUserId "did:privy:YOUR_USER_ID"\n');

  console.log("2. Start the development servers:");
  console.log("   bun run dev          # Start all servers");
  console.log("   bun run dev:admin    # Start only admin dashboard\n");

  console.log("3. Login to the admin dashboard:");
  console.log("   http://localhost:3001\n");

  console.log("4. Explore the admin features:");
  console.log("   - User management");
  console.log("   - Card catalog (155+ cards)");
  console.log("   - Economy settings");
  console.log("   - Treasury wallets");
  console.log("   - Alert management\n");

  console.log("📚 Resources:");
  console.log("   - Setup guide: SETUP.md");
  console.log("   - Convex dashboard: https://dashboard.convex.dev");
  console.log("   - Privy dashboard: https://dashboard.privy.io\n");

  console.log("Need help? Check SETUP.md for troubleshooting.\n");
}

// Run wizard
main().catch((error) => {
  console.error("\n❌ Setup wizard failed:", error);
  process.exit(1);
});
