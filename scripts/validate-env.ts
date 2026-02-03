/**
 * Environment Validation Script
 *
 * Validates that all required environment variables are set
 * before running setup or deployment.
 */

interface EnvCheck {
  name: string;
  required: boolean;
  description: string;
  present: boolean;
  value?: string;
}

function checkEnv(name: string, required: boolean, description: string): EnvCheck {
  const value = process.env[name];
  const present = !!value && value.length > 0;

  return {
    name,
    required,
    description,
    present,
    value: present ? (value.substring(0, 20) + "...") : undefined,
  };
}

function validateEnvironment() {
  console.log("🔍 Validating environment configuration...\n");

  const checks: EnvCheck[] = [
    // Convex
    checkEnv("CONVEX_DEPLOYMENT", true, "Convex deployment name"),
    checkEnv("NEXT_PUBLIC_CONVEX_URL", true, "Convex public URL"),

    // Privy Authentication
    checkEnv("NEXT_PUBLIC_PRIVY_APP_ID", true, "Privy app ID (public)"),
    checkEnv("PRIVY_APP_ID", true, "Privy app ID (server)"),
    checkEnv("PRIVY_APP_SECRET", true, "Privy app secret (for treasury)"),

    // Solana (Optional but recommended)
    checkEnv("NEXT_PUBLIC_SOLANA_RPC", false, "Solana RPC endpoint (public)"),
    checkEnv("SOLANA_RPC_URL", false, "Solana RPC endpoint (server)"),
    checkEnv("NEXT_PUBLIC_SOLANA_NETWORK", false, "Solana network"),

    // Token Configuration (Optional)
    checkEnv("NEXT_PUBLIC_LTCG_TOKEN_MINT", false, "LTCG token mint address"),
    checkEnv("NEXT_PUBLIC_LTCG_TOKEN_DECIMALS", false, "Token decimals"),

    // Storage (Optional)
    checkEnv("BLOB_READ_WRITE_TOKEN", false, "Vercel Blob storage token"),
    checkEnv("EDGE_CONFIG", false, "Vercel Edge Config"),

    // Feature Flags (Optional)
    checkEnv("NEXT_PUBLIC_HYPERTUNE_TOKEN", false, "Hypertune feature flags"),
  ];

  // Print results
  const required = checks.filter((c) => c.required);
  const optional = checks.filter((c) => !c.required);

  console.log("📋 Required Variables:");
  for (const check of required) {
    const status = check.present ? "✅" : "❌";
    console.log(`  ${status} ${check.name}`);
    console.log(`     ${check.description}`);
    if (!check.present) {
      console.log(`     ⚠️  MISSING - This is required!`);
    }
  }

  console.log("\n📋 Optional Variables:");
  for (const check of optional) {
    const status = check.present ? "✅" : "⚪";
    console.log(`  ${status} ${check.name}`);
    console.log(`     ${check.description}`);
    if (!check.present) {
      console.log(`     ℹ️  Not set (optional)`);
    }
  }

  // Summary
  const missingRequired = required.filter((c) => !c.present);
  const presentOptional = optional.filter((c) => c.present);

  console.log("\n📊 Summary:");
  console.log(`  Required: ${required.length - missingRequired.length}/${required.length} configured`);
  console.log(`  Optional: ${presentOptional.length}/${optional.length} configured`);

  if (missingRequired.length > 0) {
    console.log("\n❌ Environment validation FAILED");
    console.log("\n⚠️  Missing required variables:");
    for (const check of missingRequired) {
      console.log(`  - ${check.name}`);
    }
    console.log("\n💡 Next steps:");
    console.log("  1. Copy .env.example to .env.local");
    console.log("  2. Fill in the required values");
    console.log("  3. Restart your development server");
    console.log("  4. Run this script again\n");
    process.exit(1);
  }

  console.log("\n✅ Environment validation PASSED");
  console.log("   All required variables are configured.\n");

  if (optional.length - presentOptional.length > 0) {
    console.log("💡 Optional features available:");
    if (!checks.find((c) => c.name === "PRIVY_APP_SECRET")?.present) {
      console.log("  - Configure PRIVY_APP_SECRET to enable treasury wallets");
    }
    if (!checks.find((c) => c.name === "NEXT_PUBLIC_SOLANA_RPC")?.present) {
      console.log("  - Configure Solana RPC for treasury balance tracking");
    }
    if (!checks.find((c) => c.name === "BLOB_READ_WRITE_TOKEN")?.present) {
      console.log("  - Configure Vercel Blob for file uploads");
    }
    if (!checks.find((c) => c.name === "NEXT_PUBLIC_HYPERTUNE_TOKEN")?.present) {
      console.log("  - Configure Hypertune for feature flags");
    }
    console.log();
  }

  return true;
}

// Run validation
try {
  validateEnvironment();
} catch (error) {
  console.error("❌ Validation error:", error);
  process.exit(1);
}
