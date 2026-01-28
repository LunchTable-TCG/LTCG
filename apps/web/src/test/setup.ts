/**
 * Test setup file for React component and hook tests
 * Configures mocks for external dependencies
 */

import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

// Make React available globally for JSX
(global as any).React = React;

// Mock Convex React client
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  ConvexReactClient: vi.fn(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
  usePaginatedQuery: vi.fn(),
}));

// Mock authentication hook
vi.mock("@/hooks/auth/useConvexAuthHook", () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: {
      id: "test-user-id",
      username: "TestUser",
    },
  })),
}));

// Mock Convex Dev auth actions
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: vi.fn(() => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  })),
}));

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock sonner toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock framer-motion to avoid animation complexities in tests
vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_, prop) => {
        const Component = ({ children, ...props }: any) => {
          // Create the appropriate HTML element to maintain semantics
          const Element = String(prop);
          return React.createElement(Element, props, children);
        };
        Component.displayName = `motion.${String(prop)}`;
        return Component;
      },
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));
