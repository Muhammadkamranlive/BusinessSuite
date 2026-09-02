import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";

/** Paths under /public/PublicImages — real ERP screenshots for marketing */
const IMG = {
  sales: "/PublicImages/SALES.png",
  admin: "/PublicImages/administration.png",
  operations: "/PublicImages/OPRATIONS.png",
  healthcare: "/PublicImages/healthcare.png",
  crm: "/PublicImages/CRM-Dashboard.png"
} as const;

export type CmsStatus = "draft" | "published";

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverEmoji: string;
  coverImage?: string;
  author: string;
  status: CmsStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type CmsMenu = {
  id: string;
  label: string;
  slug: string;
  description: string;
  sortOrder: number;
  status: CmsStatus;
  createdAt: string;
  updatedAt: string;
};

export type CmsPage = {
  id: string;
  menuId: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  sortOrder: number;
  status: CmsStatus;
  createdAt: string;
  updatedAt: string;
};

const BLOGS_KEY = "businesssuite:cms:blogs";
const MENUS_KEY = "businesssuite:cms:menus";
const PAGES_KEY = "businesssuite:cms:pages";
const CONTACT_KEY = "businesssuite:cms:contact-inquiries";
const SITE_SEED_KEY = "businesssuite:cms:site-v6";

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const stored = loadPersisted<T>(key);
  if (stored == null) {
    savePersisted(key, fallback);
    return fallback;
  }
  return stored;
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  savePersisted(key, value);
}

const defaultBlogs: BlogPost[] = [
  {
    id: "blog-1",
    title: "How growing U.S. companies replace spreadsheets with one ERP",
    slug: "replace-spreadsheets-with-erp",
    excerpt:
      "When quoting, inventory, payroll, and collections live in different files, growth stalls. Here is how operators consolidate without a 12-month implementation.",
    content:
      "Most mid-market teams still run the business on a patchwork of Excel, email, and a handful of single-purpose apps. It works until it does not: a missed reorder, an unpaid invoice, a payroll exception that nobody can explain.\n\nBusinessSuite ERP Cloud is built for that moment. Sales, purchasing, inventory, operations, HR, hospital HMS, and finance share one company workspace, with role-based access so the warehouse never sees payroll and finance never overwrites CRM.\n\nImplementation is measured in days, not quarters. You create a company, choose Silver, Gold, Platinum, or Professional, activate with a card on file, and your teams start working in the same system of record.\n\nThe result is not another dashboard. It is fewer hand-offs, cleaner month-end, and a leadership view you can trust.",
    coverEmoji: "📈",
    coverImage: IMG.sales,
    author: "Lauren Hale",
    status: "published",
    tags: ["Operations", "Leadership", "ERP"],
    createdAt: now(),
    updatedAt: now(),
    publishedAt: now()
  },
  {
    id: "blog-2",
    title: "Access control that finance and IT can both sign off on",
    slug: "enterprise-access-control-erp",
    excerpt:
      "View, create, update, and delete rights at the menu level — assigned by role and adjusted per user — without custom development.",
    content:
      "Security conversations stall ERP deals when the product only offers “admin or not.” U.S. buyers expect least-privilege access, an audit trail, and the ability to revoke a single screen without taking down a module.\n\nBusinessSuite ships menu-level rights: View, Create, Update, and Delete. Company admins set the default matrix for each role, then grant or revoke exceptions for a named employee.\n\nSoft-delete recycle bins keep operational teams productive while administration retains a second line of recovery. Combined with Stripe-backed subscriptions, the platform is ready for a real commercial relationship — not a sandbox demo.",
    coverEmoji: "🔐",
    coverImage: IMG.admin,
    author: "Marcus Ellison",
    status: "published",
    tags: ["Security", "Compliance", "Admin"],
    createdAt: now(),
    updatedAt: now(),
    publishedAt: now()
  },
  {
    id: "blog-3",
    title: "Inventory, purchasing, and sales on one operating cadence",
    slug: "inventory-purchasing-sales-cadence",
    excerpt:
      "Quotations become orders, orders become invoices, receipts post stock — without exporting CSV files between departments.",
    content:
      "Distribution and light manufacturing teams lose margin in the gaps between sales and the warehouse. A quote that never became an order. A PO that never became a receipt. Stock that looks available until someone tries to pick it.\n\nBusinessSuite connects those documents in one tenant. Sales quotations convert to orders and invoices. Purchase orders receive against goods receipts with three-way match. Inventory movements, lots, serials, transfers, and adjustments stay visible. Plant work orders and BOMs sit in Operations when you are on Platinum.\n\nWhen finance closes the month, they are looking at the same numbers operations already used all week.",
    coverEmoji: "📦",
    coverImage: IMG.operations,
    author: "Priya Nair",
    status: "published",
    tags: ["Inventory", "Sales", "Purchasing"],
    createdAt: now(),
    updatedAt: now(),
    publishedAt: now()
  },
  {
    id: "blog-4",
    title: "Hospital HMS and plant operations in the same ERP login",
    slug: "hospital-hms-and-plant-operations",
    excerpt:
      "Patients, OPD, pharmacy, and lab next to BOM, work orders, and maintenance — without a second clinical or MES product on day one.",
    content:
      "Clinics and light manufacturers often buy a hospital system and an ERP, then spend a year reconciling people, stock, and money.\n\nBusinessSuite keeps hospital CRUD (patients, appointments, OPD/IPD, pharmacy, lab orders, claims, quality) and plant CRUD (BOM, work orders, maintenance, inspections, fleet, contracts) in the same tenant as finance and HR. Imaging viewers, SMS reminders, and bank statement import remain on the third-party list until you are ready to wire them.\n\nPlatinum and Professional include both modules. Gold already has the commercial core: CRM, sales, procurement, inventory, HRM, and finance — including banks, lots, and debit notes inside those products.",
    coverEmoji: "🏥",
    coverImage: IMG.healthcare,
    author: "Nadia Rahman",
    status: "published",
    tags: ["Healthcare", "Operations", "ERP"],
    createdAt: now(),
    updatedAt: now(),
    publishedAt: now()
  }
];

const defaultMenus: CmsMenu[] = [
  {
    id: "menu-1",
    label: "Company",
    slug: "company",
    description: "Who we are and how to reach us",
    sortOrder: 1,
    status: "published",
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "menu-legal",
    label: "Legal",
    slug: "legal",
    description: "Policies that govern use of BusinessSuite",
    sortOrder: 3,
    status: "published",
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "menu-2",
    label: "Resources",
    slug: "resources",
    description: "Guides for customers and partners",
    sortOrder: 2,
    status: "published",
    createdAt: now(),
    updatedAt: now()
  }
];

const defaultPages: CmsPage[] = [
  {
    id: "page-1",
    menuId: "menu-1",
    title: "About us",
    slug: "about",
    summary: "The cloud ERP built for operators who have outgrown disconnected tools — including hospitals and plants.",
    content:
      "## Why we exist\nBusinessSuite ERP Cloud is a multi-tenant operations platform for growing companies — wholesale, distribution, services, light manufacturing, clinics and hospitals, and professional firms.\n\nWe built one product instead of a stack of apps: CRM and sales, procurement and inventory, plant operations, HR and payroll, hospital HMS (patients, OPD/IPD, pharmacy, lab), finance, projects, documents, and reporting. Every company gets an isolated workspace, branded documents, and access rights that match how real teams work.\n\nEmail, SMS, bank feeds, PACS, and payment gateways are listed under Administration → Third-party integrations and wired later — they do not block the CRUD you run day one.\n\n## How we sell\nOur commercial model is straightforward. You subscribe to Silver, Gold, Platinum, or Professional. Monthly and annual billing is processed securely on our site with Stripe. Your account activates when payment succeeds — the same motion you expect from a production SaaS product. Operations and Healthcare are included on Platinum and Professional.\n\n## Where we work\nLeadership is based in Austin, Texas. Support hours follow Eastern Time. We design for operators, controllers, clinicians, and department managers who need software that looks finished on day one.",
    sortOrder: 1,
    status: "published",
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "page-2",
    menuId: "menu-1",
    title: "Contact us",
    slug: "contact",
    summary: "Talk with a specialist about rollout, packages, or a live walkthrough.",
    content:
      "## What happens next\nUse the form on this page and a specialist will respond within one business day. Tell us about your current tools, team size, and whether you need a guided rollout.\n\n## Existing customers\nFor billing changes after you subscribe, sign in and open Administration → My company & billing. Operational issues can go to support@businesssuite.app — we already have your company and subscription on file.",
    sortOrder: 2,
    status: "published",
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "page-careers",
    menuId: "menu-1",
    title: "Careers",
    slug: "careers",
    summary: "We hire operators, designers, and engineers who care about the back office.",
    content:
      "BusinessSuite is hiring across product, customer success, and implementation. We look for people who have sat next to a warehouse manager or a controller — not only next to a whiteboard.\n\nOpen conversations include Implementation Consultant (U.S. remote), Product Designer, and Customer Success Manager.\n\nSend a note through Contact us with the role in the subject line. We reply to every application we receive.",
    sortOrder: 3,
    status: "published",
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "page-3",
    menuId: "menu-2",
    title: "Getting started",
    slug: "getting-started",
    summary: "From company signup to a live operating workspace.",
    content:
      "1. Create your company on the signup page with your work email.\n2. Choose Silver, Gold, Platinum, or Professional — monthly or yearly.\n3. Activate with a card using Stripe Elements on our site (no redirect checkout).\n4. Invite your team, assign roles, and open the modules your package includes (Operations and Healthcare on Platinum and Professional).\n5. Walk the public module pages at /product/crm through /product/healthcare to see menus and flows before go-live.\n6. Administrators can publish About, Contact, and legal pages from Administration → Menus & Pages, and articles from Blogs.\n\nNeed a guided rollout? Contact sales and we will schedule a working session in Eastern Time.",
    sortOrder: 1,
    status: "published",
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "page-support",
    menuId: "menu-2",
    title: "Support",
    slug: "support",
    summary: "How customers get help after go-live.",
    content:
      "In-app help lives beside every module. For account and billing questions, sign in and open My company & billing.\n\nEmail support@businesssuite.app for operational issues. Gold and above include priority response during U.S. business hours.\n\nWe do not ask you to file tickets in a disconnected portal for routine questions — write us, and we answer with the company and subscription we already have on file.",
    sortOrder: 2,
    status: "published",
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "page-privacy",
    menuId: "menu-legal",
    title: "Privacy policy",
    slug: "privacy",
    summary: "How BusinessSuite collects, uses, and protects personal information.",
    content:
      "Last updated: August 12, 2026\n\n## Who we are\nBusinessSuite, Inc. (“BusinessSuite,” “we,” “us”) provides cloud ERP software to businesses in the United States and internationally. This policy describes how we handle personal information of website visitors, trial users, and paying customers.\n\n## Information we collect\nInformation we collect includes name, work email, company name, billing details processed by Stripe, and usage data needed to operate the service. We do not sell personal information.\n\n## How we use information\nWe use information to provide the product, process subscriptions, secure accounts, improve the service, and communicate about your company workspace. Payment card data is handled by Stripe; we do not store full card numbers on our servers.\n\n## Retention and your rights\nWe retain account data for the life of the subscription and a limited period afterward as required for tax, fraud prevention, and legal obligations. You may request access or deletion of personal information by emailing privacy@businesssuite.app.\n\n## Cookies\nThis site may use essential cookies for session and security. Analytics cookies, if enabled, can be declined where required by law.\n\n## Contact\nFor questions, contact BusinessSuite, Inc., 500 West 2nd Street, Suite 1900, Austin, TX 78701, or privacy@businesssuite.app.",
    sortOrder: 1,
    status: "published",
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "page-terms",
    menuId: "menu-legal",
    title: "Terms of service",
    slug: "terms",
    summary: "The agreement that governs your use of BusinessSuite ERP Cloud.",
    content:
      "Last updated: August 12, 2026\n\n## Agreement\nThese Terms of Service (“Terms”) are a contract between you and BusinessSuite, Inc. By creating an account or subscribing, you agree to these Terms.\n\n## The service\nThe service is a multi-tenant cloud ERP. You are responsible for users you invite, the accuracy of data you enter, and compliance with employment, tax, and industry rules that apply to your business. We provide software; we are not your accountant, lawyer, or employer of record.\n\n## Billing\nSubscriptions are billed monthly or annually in U.S. dollars through Stripe. Fees are due in advance. Upgrades take effect when payment is confirmed. Downgrades apply at the next renewal unless otherwise agreed in writing. Except where required by law, fees are non-refundable once a billing period has started.\n\n## Acceptable use\nYou may not reverse engineer the service, share login credentials in an unlawful manner, or use the product to process data you do not have the right to process.\n\n## Suspension and termination\nWe may suspend access for non-payment, security risk, or material breach. Either party may terminate for convenience at the end of a paid term. Upon termination, you may export available records during a limited window; we then delete or anonymize company data according to our retention schedule.\n\n## Warranty and liability\nTHE SERVICE IS PROVIDED “AS IS.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, BUSINESSSUITE DISCLAIMS IMPLIED WARRANTIES. OUR LIABILITY FOR A CLAIM SHALL NOT EXCEED THE FEES YOU PAID TO US IN THE TWELVE MONTHS BEFORE THE CLAIM.\n\n## Governing law\nThese Terms are governed by the laws of the State of Texas, excluding conflict-of-law rules. Venue lies in state or federal courts located in Travis County, Texas.\n\nQuestions: legal@businesssuite.app.",
    sortOrder: 2,
    status: "published",
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "page-cookies",
    menuId: "menu-legal",
    title: "Cookie policy",
    slug: "cookies",
    summary: "Cookies and similar technologies used on businesssuite.app.",
    content:
      "Last updated: August 12, 2026\n\n## Overview\nWe use cookies and similar technologies to keep you signed in, protect the service, and remember preferences such as company workspace.\n\n## Essential cookies\nEssential cookies are required for login, CSRF protection, and subscription checkout with Stripe Elements. These cannot be switched off if you use the product.\n\n## Optional cookies\nOptional analytics cookies, when present, help us understand which public pages are useful. You can control optional cookies in your browser.\n\n## Payments\nStripe may set cookies as part of secure payment. See Stripe’s documentation for details.\n\n## Contact\nContact privacy@businesssuite.app for cookie questions.",
    sortOrder: 3,
    status: "published",
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "page-security",
    menuId: "menu-legal",
    title: "Security",
    slug: "security",
    summary: "How we protect customer workspaces and payments.",
    content:
      "## Tenant isolation\nBusinessSuite is engineered as a multi-tenant product: each company workspace is isolated by tenant identifier, access control, and audit logging.\n\n## Access control\nAccess control is menu-level (view, create, update, delete) at both role and user override. Super Admin and Company Admin privileges are explicit. Soft-deleted records move to module recycle bins; only administration can purge permanently.\n\n## Payments\nPayments use Stripe Elements on our domain. Card details are tokenized by Stripe. We do not use redirect Checkout for subscriptions.\n\n## Sessions\nSessions are cookie-gated for ERP routes. We recommend unique passwords and, where enabled, multi-factor authentication.\n\n## Disclosure\nTo report a vulnerability, email security@businesssuite.app. Please give us a reasonable opportunity to investigate before public disclosure.",
    sortOrder: 4,
    status: "published",
    createdAt: now(),
    updatedAt: now()
  }
];

export function listBlogs(includeDrafts = false) {
  const blogs = read(BLOGS_KEY, defaultBlogs);
  return includeDrafts ? blogs : blogs.filter((b) => b.status === "published");
}

export function getBlogBySlug(slug: string, includeDrafts = false) {
  return listBlogs(includeDrafts).find((b) => b.slug === slug) ?? null;
}

export function saveBlog(
  input: Omit<BlogPost, "id" | "createdAt" | "updatedAt" | "slug"> & { id?: string; slug?: string }
) {
  const blogs = listBlogs(true);
  const slug = slugify(input.slug || input.title);
  if (!slug) throw new Error("Title is required to generate a slug.");

  if (input.id) {
    const index = blogs.findIndex((b) => b.id === input.id);
    if (index === -1) throw new Error("Blog not found.");
    blogs[index] = {
      ...blogs[index],
      ...input,
      slug,
      updatedAt: now(),
      publishedAt: input.status === "published" ? blogs[index].publishedAt ?? now() : blogs[index].publishedAt
    };
    write(BLOGS_KEY, blogs);
    return blogs[index];
  }

  if (blogs.some((b) => b.slug === slug)) throw new Error("A blog with this slug already exists.");
  const post: BlogPost = {
    id: id(),
    title: input.title,
    slug,
    excerpt: input.excerpt,
    content: input.content,
    coverEmoji: input.coverEmoji || "📰",
    coverImage: input.coverImage,
    author: input.author,
    status: input.status,
    tags: input.tags,
    createdAt: now(),
    updatedAt: now(),
    publishedAt: input.status === "published" ? now() : undefined
  };
  blogs.unshift(post);
  write(BLOGS_KEY, blogs);
  return post;
}

export function deleteBlog(blogId: string) {
  write(BLOGS_KEY, listBlogs(true).filter((b) => b.id !== blogId));
}

export function listMenus(includeDrafts = false) {
  const menus = read(MENUS_KEY, defaultMenus).sort((a, b) => a.sortOrder - b.sortOrder);
  return includeDrafts ? menus : menus.filter((m) => m.status === "published");
}

export function getMenuBySlug(slug: string, includeDrafts = false) {
  return listMenus(includeDrafts).find((m) => m.slug === slug) ?? null;
}

export function saveMenu(input: Omit<CmsMenu, "id" | "createdAt" | "updatedAt" | "slug"> & { id?: string; slug?: string }) {
  const menus = listMenus(true);
  const slug = slugify(input.slug || input.label);
  if (!slug) throw new Error("Menu label is required.");

  if (input.id) {
    const index = menus.findIndex((m) => m.id === input.id);
    if (index === -1) throw new Error("Menu not found.");
    menus[index] = { ...menus[index], ...input, slug, updatedAt: now() };
    write(MENUS_KEY, menus);
    return menus[index];
  }

  if (menus.some((m) => m.slug === slug)) throw new Error("A menu with this slug already exists.");
  const menu: CmsMenu = {
    id: id(),
    label: input.label,
    slug,
    description: input.description,
    sortOrder: input.sortOrder,
    status: input.status,
    createdAt: now(),
    updatedAt: now()
  };
  menus.push(menu);
  write(MENUS_KEY, menus);
  return menu;
}

export function deleteMenu(menuId: string) {
  write(MENUS_KEY, listMenus(true).filter((m) => m.id !== menuId));
  write(
    PAGES_KEY,
    listPages(undefined, true).filter((p) => p.menuId !== menuId)
  );
}

export function listPages(menuId?: string, includeDrafts = false) {
  let pages = read(PAGES_KEY, defaultPages).sort((a, b) => a.sortOrder - b.sortOrder);
  if (menuId) pages = pages.filter((p) => p.menuId === menuId);
  return includeDrafts ? pages : pages.filter((p) => p.status === "published");
}

export function getPage(menuSlug: string, pageSlug: string, includeDrafts = false) {
  const menu = getMenuBySlug(menuSlug, includeDrafts);
  if (!menu) return null;
  const page = listPages(menu.id, includeDrafts).find((p) => p.slug === pageSlug) ?? null;
  if (!page) return null;
  return { menu, page };
}

export function savePage(
  input: Omit<CmsPage, "id" | "createdAt" | "updatedAt" | "slug"> & { id?: string; slug?: string }
) {
  const pages = listPages(undefined, true);
  const slug = slugify(input.slug || input.title);
  if (!slug) throw new Error("Page title is required.");

  if (input.id) {
    const index = pages.findIndex((p) => p.id === input.id);
    if (index === -1) throw new Error("Page not found.");
    pages[index] = { ...pages[index], ...input, slug, updatedAt: now() };
    write(PAGES_KEY, pages);
    return pages[index];
  }

  if (pages.some((p) => p.menuId === input.menuId && p.slug === slug)) {
    throw new Error("A page with this slug already exists under the selected menu.");
  }

  const page: CmsPage = {
    id: id(),
    menuId: input.menuId,
    title: input.title,
    slug,
    summary: input.summary,
    content: input.content,
    sortOrder: input.sortOrder,
    status: input.status,
    createdAt: now(),
    updatedAt: now()
  };
  pages.push(page);
  write(PAGES_KEY, pages);
  return page;
}

export function deletePage(pageId: string) {
  write(
    PAGES_KEY,
    listPages(undefined, true).filter((p) => p.id !== pageId)
  );
}

export type ContactInquiry = {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  createdAt: string;
};

export function submitContactInquiry(input: Omit<ContactInquiry, "id" | "createdAt">) {
  const rows = read<ContactInquiry[]>(CONTACT_KEY, []);
  const item: ContactInquiry = { ...input, id: id(), createdAt: now() };
  rows.unshift(item);
  write(CONTACT_KEY, rows.slice(0, 500));
  return item;
}

export const publicPageRoutes: Record<string, { menuSlug: string; pageSlug: string }> = {
  about: { menuSlug: "company", pageSlug: "about" },
  contact: { menuSlug: "company", pageSlug: "contact" },
  careers: { menuSlug: "company", pageSlug: "careers" },
  support: { menuSlug: "resources", pageSlug: "support" },
  "getting-started": { menuSlug: "resources", pageSlug: "getting-started" },
  privacy: { menuSlug: "legal", pageSlug: "privacy" },
  terms: { menuSlug: "legal", pageSlug: "terms" },
  cookies: { menuSlug: "legal", pageSlug: "cookies" },
  security: { menuSlug: "legal", pageSlug: "security" }
};

/** Merge production legal/company pages into existing CMS without wiping custom admin pages. */
export function ensureProductionSiteContent() {
  if (typeof window === "undefined") return;
  if (loadPersisted<string>(SITE_SEED_KEY) === "1") return;

  const menus = read<CmsMenu[]>(MENUS_KEY, defaultMenus);
  for (const seed of defaultMenus) {
    if (!menus.some((m) => m.id === seed.id || m.slug === seed.slug)) menus.push(seed);
    else {
      const idx = menus.findIndex((m) => m.id === seed.id || m.slug === seed.slug);
      if (idx >= 0 && (menus[idx].id === seed.id || seed.slug === "legal")) {
        menus[idx] = { ...menus[idx], ...seed, id: menus[idx].id };
      }
    }
  }
  write(MENUS_KEY, menus);

  const pages = read<CmsPage[]>(PAGES_KEY, defaultPages);
  for (const seed of defaultPages) {
    const idx = pages.findIndex((p) => p.id === seed.id || (p.slug === seed.slug && p.menuId === seed.menuId));
    if (idx < 0) pages.push(seed);
    else pages[idx] = { ...pages[idx], ...seed, id: pages[idx].id, menuId: pages[idx].menuId };
  }
  write(PAGES_KEY, pages);

  const blogs = read<BlogPost[]>(BLOGS_KEY, defaultBlogs);
  for (const seed of defaultBlogs) {
    const idx = blogs.findIndex((b) => b.id === seed.id || b.slug === seed.slug);
    if (idx < 0) blogs.unshift(seed);
    else blogs[idx] = { ...blogs[idx], ...seed, id: blogs[idx].id };
  }
  write(BLOGS_KEY, blogs);

  savePersisted(SITE_SEED_KEY, "1");
}

export { slugify };
