"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { ensureProductionSiteContent, listBlogs, type BlogPost } from "@/modules/cms/services/cms.store";

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    ensureProductionSiteContent();
    setPosts(listBlogs());
  }, []);

  return (
    <PublicSiteShell>
      <section className="relative overflow-hidden">
        <div className="mkt-mesh absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="mkt-eyebrow">Insights</p>
          <h1 className="mkt-display mt-4 max-w-3xl text-4xl sm:text-5xl">Operating notes for growing companies</h1>
          <p className="mkt-muted mt-5 max-w-2xl text-base leading-7">
            Practical writing on running a growing company — sales, stock, people, and finance.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="mkt-card group overflow-hidden">
              <div className="h-44 overflow-hidden bg-[#f6f9fc]">
                {post.coverImage ? (
                  <img src={post.coverImage} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">{post.coverEmoji}</div>
                )}
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#eef0ff] px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--bs-teal)]">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="mt-3 text-lg font-semibold text-[#0a2540]">{post.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#425466]">{post.excerpt}</p>
                <p className="mt-4 text-xs text-slate-400">
                  {post.author} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-US") : ""}
                </p>
              </div>
            </Link>
          ))}
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-[#e6ebf1] bg-white p-8 text-center text-sm text-slate-500 md:col-span-2 lg:col-span-3">
              No published posts yet.
            </div>
          ) : null}
        </div>
      </div>
    </PublicSiteShell>
  );
}
