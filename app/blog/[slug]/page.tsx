"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { CmsArticle } from "@/components/marketing/cms-article";
import { MktCta } from "@/components/marketing/mkt-button";
import { getBlogBySlug, type BlogPost } from "@/modules/cms/services/cms.store";

export default function BlogDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    setPost(getBlogBySlug(slug));
  }, [slug]);

  if (!post) {
    return (
      <PublicSiteShell>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="mkt-display text-2xl">Article not found</p>
          <div className="mt-6 flex justify-center">
            <MktCta href="/blog" variant="secondary">
              Back to insights
            </MktCta>
          </div>
        </div>
      </PublicSiteShell>
    );
  }

  return (
    <PublicSiteShell>
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <Link href="/blog" className="text-sm font-semibold text-[color:var(--bs-teal)] hover:underline">
          ← Insights
        </Link>
        {post.coverImage ? (
          <img src={post.coverImage} alt="" className="mt-6 h-64 w-full rounded-[1.5rem] object-cover shadow-[0_24px_50px_rgba(10,37,64,0.12)]" />
        ) : (
          <p className="mt-6 text-4xl">{post.coverEmoji}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#eef0ff] px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--bs-teal)]">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-4">
          <CmsArticle title={post.title} summary={post.excerpt} content={post.content} />
        </div>
        <p className="mt-10 text-sm text-slate-500">
          {post.author} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-US", { dateStyle: "long" }) : "Draft"}
        </p>
      </article>
    </PublicSiteShell>
  );
}
