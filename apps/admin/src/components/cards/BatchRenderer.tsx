"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BatchRenderer() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Batch Render Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Batch rendering interface coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
