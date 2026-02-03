export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const slug = params.slug?.join("/") || "index";

  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>Documentation</h1>
      <p>Path: /{slug}</p>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-2">📄 Simplified Docs Page</h3>
        <p className="mb-4">
          The fumadocs loader is having compatibility issues. This is a temporary simplified
          version.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          40+ documentation files are ready in packages/docs/content/
        </p>
      </div>
    </article>
  );
}

// Minimal static params
export async function generateStaticParams() {
  return [
    { slug: [] },
    { slug: ["learn"] },
    { slug: ["reference"] },
    { slug: ["develop"] },
    { slug: ["integrate"] },
  ];
}

// Generate metadata for SEO
export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const slug = params.slug?.join("/") || "index";

  return {
    title: `${slug} | LTCG Docs`,
  };
}
