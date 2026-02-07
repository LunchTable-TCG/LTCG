"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { typedApi, useConvexMutation } from "@/lib/convexHelpers";
import { runUploadBackgrounds } from "./actions";

interface UploadResult {
  filename: string;
  success: boolean;
  blobUrl: string;
  width: number;
  height: number;
  error?: string;
}

export default function UploadBackgroundsPage() {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [cardBackAdded, setCardBackAdded] = useState(false);

  const createBackground = useConvexMutation(typedApi.cardBackgrounds.create);

  const handleAddCardBack = async () => {
    try {
      await createBackground({
        filename: "card-back.png",
        blobUrl: "https://vuussqnjyqkpj1mb.public.blob.vercel-storage.com/card-back/card-back.png",
        width: 1063,
        height: 1063,
        tags: ["card-back"],
      });
      setCardBackAdded(true);
      alert("Card back added successfully!");
    } catch (error) {
      console.error("Failed to add card back:", error);
      alert("Failed to add card back. Check console for details.");
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    setResults([]);

    try {
      const uploadResults = await runUploadBackgrounds("/Users/home/Downloads/cards-raw");

      // Save to Convex
      for (const result of uploadResults) {
        if (result.success) {
          await createBackground({
            filename: result.filename,
            blobUrl: result.blobUrl,
            width: result.width,
            height: result.height,
            tags: ["infernal-dragons"],
          });
        }
      }

      setResults(uploadResults);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Card Backgrounds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload all card backgrounds from /Users/home/Downloads/cards-raw to Vercel Blob
          </p>

          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? "Uploading..." : "Start Upload"}
            </Button>

            <Button
              onClick={handleAddCardBack}
              disabled={uploading || cardBackAdded}
              variant="secondary"
            >
              {cardBackAdded ? "Card Back Added" : "Add Card Back"}
            </Button>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading backgrounds...</span>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Results:</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {results.map((r) => (
                  <div
                    key={r.filename}
                    className={`text-sm ${r.success ? "text-green-600" : "text-red-600"}`}
                  >
                    {r.filename}: {r.success ? "Success" : `${r.error}`}
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold mt-4">
                Uploaded: {results.filter((r) => r.success).length} / {results.length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
