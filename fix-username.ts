// Quick script to fix the username
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env["NEXT_PUBLIC_CONVEX_URL"]!);

async function fixUsername() {
  try {
    const result = await client.mutation(
      "core/users:setMyUsername" as any,
      { username: "Dexploarer" }
    );
    console.log("✅ Username fixed:", result);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

fixUsername();
