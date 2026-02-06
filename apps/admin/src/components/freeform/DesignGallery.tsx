"use client";

import { Card, Text, Title } from "@tremor/react";
import { Copy, LayoutTemplate, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { DesignListItem } from "./types";
import type { Id } from "@convex/_generated/dataModel";

export function DesignGallery() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);

  // Form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [duplicateName, setDuplicateName] = useState("");

  // Queries
  const designs = useConvexQuery(typedApi.admin.freeformDesigns.listDesigns, {}) as
    | DesignListItem[]
    | undefined;

  // Mutations
  const createDesign = useConvexMutation(typedApi.admin.freeformDesigns.createDesign);
  const duplicateDesign = useConvexMutation(typedApi.admin.freeformDesigns.duplicateDesign);
  const deleteDesign = useConvexMutation(typedApi.admin.freeformDesigns.deleteDesign);

  const filteredDesigns = designs?.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const id = await createDesign({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      });
      toast.success("Design created");
      setShowCreateDialog(false);
      setNewName("");
      setNewDescription("");
      router.push(`/templates/${id}`);
    } catch {
      toast.error("Failed to create design");
    }
  };

  const handleDuplicate = async () => {
    if (!selectedDesignId || !duplicateName.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const newId = await duplicateDesign({
        designId: selectedDesignId as Id<"freeformDesigns">,
        newName: duplicateName.trim(),
      });
      toast.success("Design duplicated");
      setShowDuplicateDialog(false);
      setDuplicateName("");
      setSelectedDesignId(null);
      router.push(`/templates/${newId}`);
    } catch {
      toast.error("Failed to duplicate design");
    }
  };

  const handleDelete = async () => {
    if (!selectedDesignId) return;

    try {
      await deleteDesign({ designId: selectedDesignId as Id<"freeformDesigns"> });
      toast.success("Design deleted");
      setShowDeleteDialog(false);
      setSelectedDesignId(null);
    } catch {
      toast.error("Failed to delete design");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Title>Card Designs</Title>
          <Text className="text-muted-foreground">
            Create and manage freeform card designs
          </Text>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Design
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search designs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {!designs ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_: unknown, i: number) => (
            <Card key={`skeleton-${i}`} className="animate-pulse">
              <div className="aspect-[750/1050] bg-muted rounded-lg mb-4" />
              <div className="h-5 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : filteredDesigns?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <LayoutTemplate className="h-12 w-12 text-muted-foreground mb-4" />
          <Title>No designs found</Title>
          <Text className="text-muted-foreground mb-4">
            {searchQuery
              ? "Try adjusting your search"
              : "Create your first card design to get started"}
          </Text>
          {!searchQuery && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Design
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDesigns?.map((design) => (
            <Card key={design._id} className="group relative overflow-hidden">
              <Link href={`/templates/${design._id}`} className="block">
                {/* Thumbnail */}
                <div className="aspect-[750/1050] bg-muted rounded-lg mb-3 overflow-hidden">
                  {design.thumbnailUrl ? (
                    <img
                      src={design.thumbnailUrl}
                      alt={design.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <LayoutTemplate className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <h3 className="font-medium text-sm truncate">{design.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {design.elementCount} element{design.elementCount !== 1 ? "s" : ""}
                    {design.isActive ? "" : " (inactive)"}
                  </p>
                </div>
              </Link>

              {/* Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedDesignId(design._id);
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
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedDesignId(design._id);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Card Design</DialogTitle>
            <DialogDescription>
              Create a new freeform card design. You can add images and text on a 750x1050 canvas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="designName">Design Name</Label>
              <Input
                id="designName"
                placeholder="e.g., Fire Dragon Card"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designDesc">Description (optional)</Label>
              <Textarea
                id="designDesc"
                placeholder="Describe this design..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Are you sure? This will permanently delete the design and all its elements.
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
