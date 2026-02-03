import type { ReactNode } from "react";

// Simplified layout - Fumadocs will be configured later

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r p-4 hidden md:block">
        <div className="sticky top-4">
          <h2 className="font-bold mb-4">LTCG Docs</h2>
          <nav className="space-y-2">
            <a href="/docs/learn" className="block hover:text-blue-600">
              📚 Learn
            </a>
            <a href="/docs/reference/backend/schema" className="block hover:text-blue-600">
              📖 Reference
            </a>
            <a href="/docs/develop" className="block hover:text-blue-600">
              💻 Develop
            </a>
            <a href="/docs/integrate" className="block hover:text-blue-600">
              🔌 Integrate
            </a>
          </nav>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
