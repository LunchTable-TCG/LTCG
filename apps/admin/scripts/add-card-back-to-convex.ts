import { ConvexHttpClient } from "convex/browser";
import * as generatedApi from "../../../convex/_generated/api";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const apiAny = (generatedApi as any).api;

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function addCardBack() {
  try {
    const result = await client.mutation(apiAny.cardBackgrounds.create, {
      filename: "card-back.png",
      blobUrl: "https://vuussqnjyqkpj1mb.public.blob.vercel-storage.com/card-back/card-back.png",
      width: 1063,
      height: 1063,
      tags: ["card-back"],
    });

    console.log("Card back added to Convex successfully!");
    console.log("ID:", result);
  } catch (error) {
    console.error("Failed to add to Convex:", error);
    throw error;
  }
}

addCardBack();
