"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { uploadCardBackgrounds } from "@/lib/utils/uploadCardBackgrounds";
import { useMutation } from "convex/react";
import { typedApi } from "@/lib/convexHelpers";

export default function UploadBackgroundsPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, filename: "" });
  const [results, setResults] = useState<any[]>([]);
  const [cardBackAdded, setCardBackAdded] = useState(false);

  const createBackground = useMutation((typedApi as any).cardBackgrounds.create);

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
      const uploadResults = await uploadCardBackgrounds(
        "/Users/home/Downloads/cards-raw",
        (current, total, filename) => {
          setProgress({ current, total, filename });
        }
      );

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
              {cardBackAdded ? "Card Back Added ✓" : "Add Card Back"}
            </Button>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress
                value={(progress.current / progress.total) * 100}
              />
              <p className="text-sm">
                {progress.current} / {progress.total}: {progress.filename}
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Results:</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`text-sm ${r.success ? "text-green-600" : "text-red-600"}`}
                  >
                    {r.filename}: {r.success ? "✓ Success" : `✗ ${r.error}`}
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
