"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TemplateDesigner from "@/components/cards/TemplateDesigner";
import BatchRenderer from "@/components/cards/BatchRenderer";

export default function TemplateDesignerPage() {
  const [mode, setMode] = useState<"design" | "render">("design");

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Card Template Designer</h1>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "design" | "render")}>
          <TabsList>
            <TabsTrigger value="design">Design Mode</TabsTrigger>
            <TabsTrigger value="render">Render Mode</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === "design" ? <TemplateDesigner /> : <BatchRenderer />}
      </div>
    </div>
  );
}
