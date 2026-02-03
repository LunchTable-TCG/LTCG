import { getPage, getPages } from "@/source";
import { DocsBody, DocsPage } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { useMDXComponents } from "../../../mdx-components";

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = getPage(params.slug);

  if (!page) notFound();

  const MDX = page.data.exports.default;
  const components = useMDXComponents();

  return (
    <DocsPage toc={page.data.exports.toc} lastUpdate={page.data.exports.lastModified}>
      <DocsBody>
        <h1>{page.data.title}</h1>
        {page.data.description && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">{page.data.description}</p>
        )}

        <MDX components={components} />
      </DocsBody>
    </DocsPage>
  );
}

// Generate static paths for all docs at build time
export async function generateStaticParams() {
  return getPages().map((page) => ({
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
    description: page.data.description,
  };
}
