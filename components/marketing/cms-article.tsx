export function CmsArticle({
  title,
  summary,
  content,
  hideTitle = false
}: {
  title: string;
  summary?: string;
  content: string;
  hideTitle?: boolean;
}) {
  const blocks = parseContent(content);
  return (
    <article className="mkt-prose mx-auto max-w-3xl">
      {hideTitle ? null : <h1 className="mkt-display text-3xl sm:text-4xl">{title}</h1>}
      {summary ? <p className="mt-4 text-lg leading-8 text-[#425466]">{summary}</p> : null}
      <div className={`${hideTitle || summary ? "mt-8" : "mt-8"} space-y-4 text-[16.5px] leading-8 text-[#425466]`}>
        {blocks.map((block, i) => {
          if (block.type === "h2") {
            return (
              <h2 key={i} id={slugify(block.text)} className="!mt-10 scroll-mt-28">
                {block.text}
              </h2>
            );
          }
          if (block.type === "h3") {
            return (
              <h3 key={i} className="!mt-8">
                {block.text}
              </h3>
            );
          }
          if (block.type === "meta") {
            return (
              <p key={i} className="text-sm font-medium text-[color:var(--bs-teal)]">
                {block.text}
              </p>
            );
          }
          if (block.type === "ul") {
            return (
              <ul key={i} className="list-disc space-y-2 pl-5">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          }
          if (block.type === "ol") {
            return (
              <ol key={i} className="list-decimal space-y-2 pl-5">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            );
          }
          return <p key={i}>{block.text}</p>;
        })}
      </div>
    </article>
  );
}

export function extractHeadings(content: string) {
  return parseContent(content)
    .filter((b): b is { type: "h2"; text: string } => b.type === "h2")
    .map((b) => ({ id: slugify(b.text), label: b.text }));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type Block =
  | { type: "h2" | "h3" | "p" | "meta"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function parseContent(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let list: { type: "ul"; items: string[] } | { type: "ol"; items: string[] } | null = null;

  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (/^last updated:/i.test(line)) {
      flushList();
      blocks.push({ type: "meta", text: line });
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      continue;
    }
    const ul = line.match(/^[-•]\s+(.+)/);
    if (ul) {
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(ul[1]);
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.+)/);
    if (ol) {
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(ol[1]);
      continue;
    }
    flushList();
    blocks.push({ type: "p", text: line });
  }
  flushList();
  return blocks;
}
