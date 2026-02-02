import { renderHook, waitFor } from "@testing-library/react";
import * as convexReact from "convex/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useShop } from "@/hooks/economy/useShop";

// Mock imports
vi.mock("convex/react");
vi.mock("sonner");

describe("useShop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load shop products on mount", () => {
    const mockProducts = [
      {
        _id: "product_1" as any,
        type: "pack",
        name: "Starter Pack",
        goldCost: 100,
        gemCost: 10,
      },
      {
        _id: "product_2" as any,
        type: "box",
        name: "Mega Box",
        goldCost: 1000,
        gemCost: 100,
      },
    ];

    vi.mocked(convexReact.useQuery).mockReturnValue(mockProducts);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useShop());

    expect(result.current.products).toEqual(mockProducts);
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle products loading state", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useShop());

    expect(result.current.products).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it("should successfully purchase pack with gold", async () => {
    const mockResult = {
      cardsReceived: [{ _id: "card_1" as any }, { _id: "card_2" as any }],
      goldSpent: 100,
      gemsSpent: 0,
    };

    const mockPurchasePackMutation = vi.fn().mockResolvedValue(mockResult);

    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    vi.mocked(convexReact.useMutation).mockReturnValue(mockPurchasePackMutation);

    const { result } = renderHook(() => useShop());

    const purchaseResult = await result.current.purchasePack("product_1", false);

    await waitFor(() => {
      expect(mockPurchasePackMutation).toHaveBeenCalledWith({
        productId: "product_1",
        useGems: false,
      });
      expect(purchaseResult).toEqual(mockResult);
      expect(toast.success).toHaveBeenCalledWith("Pack purchased! You got 2 cards");
    });
  });

  it("should successfully purchase pack with gems", async () => {
    const mockResult = {
      cardsReceived: [{ _id: "card_1" as any }],
      goldSpent: 0,
      gemsSpent: 10,
    };

    const mockPurchasePackMutation = vi.fn().mockResolvedValue(mockResult);

    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    vi.mocked(convexReact.useMutation).mockReturnValue(mockPurchasePackMutation);

    const { result } = renderHook(() => useShop());

    const purchaseResult = await result.current.purchasePack("product_premium", true);

    await waitFor(() => {
      expect(mockPurchasePackMutation).toHaveBeenCalledWith({
        productId: "product_premium",
        useGems: true,
      });
      expect(purchaseResult).toEqual(mockResult);
      expect(toast.success).toHaveBeenCalledWith("Pack purchased! You got 1 cards");
    });
  });

  it("should handle insufficient funds error", async () => {
    const mockError = new Error("Insufficient gold");
    const mockPurchasePackMutation = vi.fn().mockRejectedValue(mockError);

    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    vi.mocked(convexReact.useMutation).mockReturnValue(mockPurchasePackMutation);

    const { result } = renderHook(() => useShop());

    await expect(result.current.purchasePack("product_1", false)).rejects.toThrow(
      "Insufficient gold"
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Insufficient gold");
    });
  });

  it("should load pack history", () => {
    const mockPackHistory = [
      {
        _id: "history_1" as any,
        productId: "product_1" as any,
        cardsReceived: [{ _id: "card_1" as any }],
        timestamp: Date.now(),
      },
      {
        _id: "history_2" as any,
        productId: "product_2" as any,
        cardsReceived: [{ _id: "card_2" as any }],
        timestamp: Date.now() - 1000,
      },
    ];

    // useShop makes two useQuery calls: products and packHistory
    vi.mocked(convexReact.useQuery)
      .mockReturnValueOnce([]) // products
      .mockReturnValueOnce(mockPackHistory); // packHistory
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useShop());

    expect(result.current.packHistory).toEqual(mockPackHistory);
  });

  it("should handle empty pack history", () => {
    // useShop makes two useQuery calls: products and packHistory
    vi.mocked(convexReact.useQuery)
      .mockReturnValueOnce([]) // products
      .mockReturnValueOnce([]); // packHistory (empty)
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useShop());

    expect(result.current.packHistory).toEqual([]);
  });

  it("should return expected interface when authenticated", () => {
    // Test with default authenticated state
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useShop());

    // Should return all expected properties
    expect(result.current).toHaveProperty("products");
    expect(result.current).toHaveProperty("packHistory");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("purchasePack");
    expect(result.current).toHaveProperty("purchaseBox");
    expect(result.current).toHaveProperty("purchaseBundle");
    expect(typeof result.current.purchasePack).toBe("function");
  });
});
