import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { PrivyAuthProvider } from "@/components/PrivyAuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Meta, Scripts } from "@tanstack/start";
import "../globals.css";
import type { ReactNode } from "react";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <Meta />
        {/* Basic font defaults until we set up dedicated fonts */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          :root {
            --font-geist-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            --font-geist-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          }
        `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-background font-sans overflow-x-hidden">
        <PrivyAuthProvider>
          <ConvexClientProvider>
            <QueryProvider>{children}</QueryProvider>
          </ConvexClientProvider>
        </PrivyAuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
