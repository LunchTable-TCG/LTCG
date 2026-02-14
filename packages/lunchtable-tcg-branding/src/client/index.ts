import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { api } from "../component/_generated/api.js";

type RunQueryCtx = { runQuery: GenericQueryCtx<GenericDataModel>["runQuery"] };
type RunMutationCtx = {
  runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
};

export type { RunQueryCtx, RunMutationCtx };
export type { api };

export class LTCGBranding {
  public folders: FoldersClient;
  public assets: AssetsClient;
  public guidelines: GuidelinesClient;

  constructor(private component: typeof api) {
    this.folders = new FoldersClient(component);
    this.assets = new AssetsClient(component);
    this.guidelines = new GuidelinesClient(component);
  }
}

// FoldersClient wrapping folders module
class FoldersClient {
  constructor(private component: typeof api) {}

  async createFolder(ctx: RunMutationCtx, args: any) {
    return await ctx.runMutation(this.component.folders.createFolder, args);
  }

  async getFolders(ctx: RunQueryCtx, parentId?: string, section?: string) {
    return await ctx.runQuery(this.component.folders.getFolders, {
      parentId: parentId as any,
      section,
    });
  }

  async getFolder(ctx: RunQueryCtx, folderId: string) {
    return await ctx.runQuery(this.component.folders.getFolder, {
      folderId: folderId as any,
    });
  }

  async updateFolder(ctx: RunMutationCtx, folderId: string, updates: any) {
    return await ctx.runMutation(this.component.folders.updateFolder, {
      folderId: folderId as any,
      updates,
    });
  }

  async deleteFolder(ctx: RunMutationCtx, folderId: string) {
    return await ctx.runMutation(this.component.folders.deleteFolder, {
      folderId: folderId as any,
    });
  }
}

// AssetsClient wrapping assets module
class AssetsClient {
  constructor(private component: typeof api) {}

  async createAsset(ctx: RunMutationCtx, args: any) {
    return await ctx.runMutation(this.component.assets.createAsset, args);
  }

  async getAssets(ctx: RunQueryCtx, folderId: string) {
    return await ctx.runQuery(this.component.assets.getAssets, {
      folderId: folderId as any,
    });
  }

  async getAsset(ctx: RunQueryCtx, assetId: string) {
    return await ctx.runQuery(this.component.assets.getAsset, {
      assetId: assetId as any,
    });
  }

  async searchAssets(ctx: RunQueryCtx, query: string) {
    return await ctx.runQuery(this.component.assets.searchAssets, { query });
  }

  async updateAsset(ctx: RunMutationCtx, assetId: string, updates: any) {
    return await ctx.runMutation(this.component.assets.updateAsset, {
      assetId: assetId as any,
      updates,
    });
  }

  async deleteAsset(ctx: RunMutationCtx, assetId: string) {
    return await ctx.runMutation(this.component.assets.deleteAsset, {
      assetId: assetId as any,
    });
  }
}

// GuidelinesClient wrapping guidelines module
class GuidelinesClient {
  constructor(private component: typeof api) {}

  async getGuidelines(ctx: RunQueryCtx, section: string) {
    return await ctx.runQuery(this.component.guidelines.getGuidelines, {
      section,
    });
  }

  async getAllGuidelines(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.guidelines.getAllGuidelines, {});
  }

  async updateGuidelines(ctx: RunMutationCtx, args: any) {
    return await ctx.runMutation(
      this.component.guidelines.updateGuidelines,
      args
    );
  }
}
