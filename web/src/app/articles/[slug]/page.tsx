import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/db";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ArticleDetail from "./ArticleDetail";
import { buildSeoMetadata } from "@/lib/seo";
import { imageAssetSrc } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    return buildSeoMetadata({
      title: "Article Not Found",
      description: "The requested article could not be found.",
      path: `/articles/${slug}`,
      noIndex: true,
    });
  }

  return buildSeoMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/articles/${article.slug}`,
    image: imageAssetSrc(article.coverImage),
    type: "article",
    publishedTime: article.publishDate,
    modifiedTime: article.updatedDate,
    authors: [article.author],
  });
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <>
      <Navbar />
      <ArticleDetail article={article} />
      <Footer />
    </>
  );
}
