import { getPage, getPages } from "@/source";
import { notFound } from "next/navigation";

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = getPage(params.slug);

  if (!page) notFound();

  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>{page.data.title}</h1>

      <div className="mt-8">
        {/* Placeholder for MDX content */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-2">📄 Documentation Content</h3>
          <p className="mb-4">
            This page exists and is ready to display: <strong>{page.data.title}</strong>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Path: <code>/{params.slug?.join("/") || "index"}</code>
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h4 className="font-semibold mb-3">Available Documentation</h4>
          <ul className="space-y-1">
            <li>✅ 40+ documentation files migrated</li>
            <li>✅ All content organized in packages/docs/content/</li>
            <li>✅ Interactive components built</li>
            <li>🔧 MDX rendering to be configured</li>
          </ul>
        </div>
      </div>
    </article>
  );
}

// Generate static paths for all docs at build time
export async function generateStaticParams() {
  const pages = getPages();
  if (!pages || !Array.isArray(pages)) {
    console.warn("getPages() did not return an array:", pages);
    return [];
  }
  return pages.map((page) => ({
    slug: page.slugs,
  }));
}

// Generate metadata for SEO
export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = getPage(params.slug);

  if (!page) return {};

  return {
    title: page.data.title,
  };
}
