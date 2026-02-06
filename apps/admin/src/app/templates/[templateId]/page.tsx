"use client";

/**
 * Freeform Design Editor Page
 *
 * Full-page editor for freeform card designs with drag/drop canvas.
 */

import { ArrowLeft, Copy, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { FreeformEditor } from "@/components/freeform/FreeformEditor";
import type { DesignWithElements } from "@/components/freeform/types";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";

interface DesignEditorPageProps {
  params: Promise<{ templateId: string }>;
}

export default function DesignEditorPage({ params }: DesignEditorPageProps) {
  const { templateId } = use(params);
  const router = useRouter();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");

  // Query
  const design = useConvexQuery(typedApi.admin.freeformDesigns.getDesign, {
    designId: templateId as Id<"freeformDesigns">,
  }) as DesignWithElements | null | undefined;

  // Mutations
  const duplicateDesign = useConvexMutation(typedApi.admin.freeformDesigns.duplicateDesign);
  const deleteDesign = useConvexMutation(typedApi.admin.freeformDesigns.deleteDesign);

  const handleDuplicate = async () => {
    if (!duplicateName.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const newId = await duplicateDesign({
        designId: templateId as Id<"freeformDesigns">,
        newName: duplicateName.trim(),
      });
      toast.success("Design duplicated");
      setShowDuplicateDialog(false);
      router.push(`/templates/${newId}`);
    } catch {
      toast.error("Failed to duplicate");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDesign({ designId: templateId as Id<"freeformDesigns"> });
      toast.success("Design deleted");
      router.push("/templates");
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Loading
  if (design === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found
  if (design === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-xl font-semibold">Design Not Found</h1>
        <p className="text-muted-foreground">This design doesn&apos;t exist or was deleted.</p>
        <Button asChild>
          <Link href="/templates">Back to Designs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">{design.name}</h1>
            <p className="text-xs text-muted-foreground">
              {design.elements.length} element{design.elements.length !== 1 ? "s" : ""} • {design.width}x{design.height}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setDuplicateName(`${design.name} (Copy)`);
                  setShowDuplicateDialog(true);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Editor */}
      <FreeformEditor design={design} />

      {/* Duplicate Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Design</DialogTitle>
            <DialogDescription>Create a copy with a new name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Name</Label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDuplicate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate}>Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Design</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This permanently deletes the design and all its elements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
