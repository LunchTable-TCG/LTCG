import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6">LTCG Documentation</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
          Comprehensive guide for Lunchtable Trading Card Game
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Link
            href="/docs/learn"
            className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-4">📚</div>
            <h2 className="text-2xl font-bold mb-2">Learn</h2>
            <p className="text-gray-600 dark:text-gray-400">Tutorials, guides, and how to play</p>
          </Link>

          <Link
            href="/docs/reference/backend/schema"
            className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-4">📖</div>
            <h2 className="text-2xl font-bold mb-2">Reference</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Card database, API docs, technical references
            </p>
          </Link>

          <Link
            href="/docs/develop"
            className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-4">💻</div>
            <h2 className="text-2xl font-bold mb-2">Develop</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Development guides, testing, contribution
            </p>
          </Link>

          <Link
            href="/docs/integrate"
            className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-4">🔌</div>
            <h2 className="text-2xl font-bold mb-2">Integrate</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Plugin system and AI agent integration
            </p>
          </Link>
        </div>

        <div className="mt-12">
          <Link
            href="/docs/learn"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Get Started →
          </Link>
        </div>
      </div>
    </main>
  );
}
