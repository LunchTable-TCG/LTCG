import { describe, expect, it, mock } from "bun:test";
import plugin from "../src/plugin";

describe("Plugin Routes", () => {
  it("should have routes defined", () => {
    expect(plugin.routes).toBeDefined();
    if (plugin.routes) {
      expect(Array.isArray(plugin.routes)).toBe(true);
      expect(plugin.routes.length).toBeGreaterThan(0);
    }
  });

  it("should have a route for /ltcg/health", () => {
    if (plugin.routes) {
      const healthRoute = plugin.routes.find((route) => route.path === "/ltcg/health");
      expect(healthRoute).toBeDefined();

      if (healthRoute) {
        expect(healthRoute.type).toBe("GET");
        expect(typeof healthRoute.handler).toBe("function");
      }
    }
  });

  it("should have webhook routes", () => {
    if (plugin.routes) {
      const gameWebhookRoute = plugin.routes.find((route) => route.path === "/ltcg/webhook/game");
      const webhookHealthRoute = plugin.routes.find(
        (route) => route.path === "/ltcg/webhook/health"
      );

      expect(gameWebhookRoute).toBeDefined();
      expect(webhookHealthRoute).toBeDefined();

      if (gameWebhookRoute) {
        expect(gameWebhookRoute.type).toBe("POST");
      }
      if (webhookHealthRoute) {
        expect(webhookHealthRoute.type).toBe("GET");
      }
    }
  });

  it("should handle health route requests correctly", async () => {
    if (plugin.routes) {
      const healthRoute = plugin.routes.find((route) => route.path === "/ltcg/health");

      if (healthRoute && healthRoute.handler) {
        // Create mock request and response objects
        const mockReq = {};
        const mockRes = {
          json: mock(),
        };

        // Mock runtime object as third parameter
        const mockRuntime = {} as any;

        // Call the route handler
        await healthRoute.handler(mockReq, mockRes, mockRuntime);

        // Verify response
        expect(mockRes.json).toHaveBeenCalledTimes(1);
        const callArgs = (mockRes.json as any).mock.calls[0][0];
        expect(callArgs.status).toBe("ok");
        expect(callArgs.plugin).toBe("ltcg");
      }
    }
  });

  it("should validate route structure", () => {
    if (plugin.routes) {
      // Validate each route
      plugin.routes.forEach((route) => {
        expect(route).toHaveProperty("path");
        expect(route).toHaveProperty("type");
        expect(route).toHaveProperty("handler");

        // Path should be a string starting with /
        expect(typeof route.path).toBe("string");
        expect(route.path.startsWith("/")).toBe(true);

        // Type should be a valid HTTP method
        expect(["GET", "POST", "PUT", "DELETE", "PATCH"]).toContain(route.type);

        // Handler should be a function
        expect(typeof route.handler).toBe("function");
      });
    }
  });

  it("should have unique route paths", () => {
    if (plugin.routes) {
      const paths = plugin.routes.map((route) => route.path);
      const uniquePaths = new Set(paths);
      expect(paths.length).toBe(uniquePaths.size);
    }
  });
});
