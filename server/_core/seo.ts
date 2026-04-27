/**
 * seo.ts — Server-side SEO layer for Nexus
 *
 * Provides three things:
 *  1. /robots.txt  — allows reputable crawlers & AI bots, blocks scrapers
 *  2. /sitemap.xml — lists every publicly accessible URL
 *  3. Per-route meta injection — for known public routes, the server rewrites
 *     the index.html <title>, <meta description>, OG/Twitter tags, canonical
 *     link, and JSON-LD structured data *before* sending the document.
 *     This makes the SPA readable by crawlers without requiring SSR.
 */

import type { Express, Request, Response, NextFunction } from "express";
import path from "node:path";
import fs from "node:fs";

// ─── Domain ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.SITE_URL ?? "https://schmo.tech";

// ─── Per-route metadata ───────────────────────────────────────────────────────

interface PageMeta {
  title: string;
  description: string;
  ogType?: string;
  jsonLd?: object | object[];
}

const PAGE_META: Record<string, PageMeta> = {
  "/": {
    title: "Nexus — AI-Powered Learning Platform",
    description:
      "Nexus is an AI-powered deep learning platform. Master any subject with adaptive AI curricula, Socratic tutoring, multi-depth concept explanations, semantic research, and curated courses in AI literacy and critical thinking.",
    ogType: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Nexus",
        url: BASE_URL,
        description:
          "AI-powered learning platform for serious learners. Adaptive curricula, Socratic tutoring, and curated courses.",
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Nexus",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        url: BASE_URL,
        description:
          "Adaptive AI learning platform with Socratic tutoring, Depth Engine, semantic research, spaced-repetition flashcards, mind maps, and curated courses.",
        featureList: [
          "AI Curriculum Generator",
          "Socratic Tutoring Mode",
          "Depth Engine — multi-layer concept explanation",
          "AI Literacy for Adults — 15-lesson course",
          "Clear Thinking & Logic — 15-lesson course",
          "Semantic Research Engine",
          "Spaced-Repetition Flashcards",
          "AI-Powered Mind Maps",
          "Study Buddy AI",
          "Gamification & XP system",
        ],
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  },

  "/about": {
    title: "About Nexus | AI-Powered Deep Learning Platform",
    description:
      "Nexus combines adaptive AI curricula, Socratic tutoring, multi-depth concept explanation, semantic research, and curated courses in AI literacy and critical thinking — built for people who want to think and learn at a higher level.",
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About Nexus",
      url: `${BASE_URL}/about`,
      description:
        "Nexus is an AI-powered learning platform for people who want to master subjects deeply — not skim surfaces. Built with adaptive AI, Socratic dialogue, and courses designed for adult serious learners.",
      mainEntity: {
        "@type": "Organization",
        name: "Nexus",
        url: BASE_URL,
      },
    },
  },

  "/contact": {
    title: "Contact | Nexus Learning Platform",
    description:
      "Get in touch with the Nexus team. Questions, feedback, partnership inquiries, or feature requests — we want to hear from you.",
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Contact Nexus",
      url: `${BASE_URL}/contact`,
    },
  },

  "/learn": {
    title: "Learn | Nexus — AI Curricula & Curated Courses",
    description:
      "Generate a personalized AI learning curriculum on any topic, or explore curated courses: AI Literacy for Adults (15 lessons) and Clear Thinking & Logic (15 lessons). Powered by adaptive AI on Nexus.",
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      name: "Nexus Learn",
      url: `${BASE_URL}/learn`,
      description: "AI-generated and curated learning paths on Nexus.",
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Nexus Course Catalog",
        itemListElement: [
          {
            "@type": "Course",
            name: "AI Literacy for Adults",
            description:
              "A comprehensive 3-module, 15-lesson course covering how AI works, how to use it effectively at work, and how to stay in control as AI becomes embedded in daily life.",
            provider: { "@type": "Organization", name: "Nexus" },
            numberOfCredits: 1110,
            educationalLevel: "Beginner to Intermediate",
            timeRequired: "PT5H",
          },
          {
            "@type": "Course",
            name: "Clear Thinking & Logic",
            description:
              "Master logical fallacies, cognitive biases, statistical reasoning, systems thinking, argument mapping, and motivated reasoning across 3 modules and 15 lessons.",
            provider: { "@type": "Organization", name: "Nexus" },
            educationalLevel: "Intermediate",
            timeRequired: "PT7H",
          },
        ],
      },
    },
  },
};

// ─── Cached built index.html ─────────────────────────────────────────────────

let _indexHtml: string | null = null;

function getIndexHtml(distPath: string): string {
  if (_indexHtml) return _indexHtml;
  const htmlPath = path.join(distPath, "index.html");
  if (!fs.existsSync(htmlPath)) return "";
  _indexHtml = fs.readFileSync(htmlPath, "utf-8");
  return _indexHtml;
}

// ─── Meta injection ──────────────────────────────────────────────────────────

function injectMeta(html: string, route: string, meta: PageMeta): string {
  const canonical = `${BASE_URL}${route === "/" ? "" : route}`;

  const jsonLdBlocks = meta.jsonLd
    ? (Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd])
        .map(
          (obj) =>
            `<script type="application/ld+json">${JSON.stringify(obj, null, 0)}</script>`
        )
        .join("\n    ")
    : "";

  // Replace <title>
  let out = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${meta.title}</title>`
  );

  // Replace description meta
  out = out.replace(
    /(<meta\s+name="description"\s+content=")[^"]*(")/,
    `$1${meta.description}$2`
  );

  // Replace OG tags
  out = out.replace(
    /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
    `$1${meta.title}$2`
  );
  out = out.replace(
    /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
    `$1${meta.description}$2`
  );
  out = out.replace(
    /(<meta\s+property="og:type"\s+content=")[^"]*(")/,
    `$1${meta.ogType ?? "website"}$2`
  );
  // Add/replace og:url (may not exist yet)
  if (/<meta\s+property="og:url"/.test(out)) {
    out = out.replace(
      /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
      `$1${canonical}$2`
    );
  } else {
    out = out.replace(
      /(<meta\s+property="og:type"[^>]*>)/,
      `$1\n    <meta property="og:url" content="${canonical}" />`
    );
  }

  // Replace Twitter Card tags
  out = out.replace(
    /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
    `$1${meta.title}$2`
  );
  out = out.replace(
    /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
    `$1${meta.description}$2`
  );

  // Inject canonical + JSON-LD before </head>
  const injection = [
    `    <link rel="canonical" href="${canonical}" />`,
    jsonLdBlocks ? `    ${jsonLdBlocks}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  out = out.replace("</head>", `${injection}\n  </head>`);

  return out;
}

// ─── Robots.txt ───────────────────────────────────────────────────────────────

const ROBOTS_TXT = `# Nexus — robots.txt
# https://schmo.tech
#
# We welcome reputable search engines and AI research crawlers.
# We block aggressive commercial SEO scrapers that consume resources without benefit.

# ── Major search engines ──────────────────────────────────────────────────────

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: Baiduspider
Allow: /

User-agent: Yandex
Allow: /

User-agent: Applebot
Allow: /

# ── Social preview crawlers ───────────────────────────────────────────────────

User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: Slackbot
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: Discordbot
Allow: /

# ── AI assistants & research crawlers ────────────────────────────────────────

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: YouBot
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: Omgilibot
Allow: /

User-agent: Diffbot
Allow: /

# ── Block aggressive SEO scrapers ────────────────────────────────────────────
# These bots scrape for competitor analysis tools — no search indexing benefit.

User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: BLEXBot
Disallow: /

User-agent: PetalBot
Disallow: /

User-agent: SeznamBot
Disallow: /

User-agent: Seekport Crawler
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: DataForSeoBot
Disallow: /

User-agent: serpstatbot
Disallow: /

User-agent: MauiBot
Disallow: /

# ── General rules ─────────────────────────────────────────────────────────────

User-agent: *
# Keep API and admin routes private
Disallow: /api/
Disallow: /admin
Disallow: /settings
Disallow: /profile
# Public routes are open
Allow: /
Allow: /about
Allow: /contact
Allow: /learn
Allow: /llms.txt

Sitemap: ${BASE_URL}/sitemap.xml`;

// ─── Sitemap ─────────────────────────────────────────────────────────────────

function buildSitemap(): string {
  const now = new Date().toISOString().split("T")[0];
  const urls: { loc: string; priority: string; changefreq: string }[] = [
    { loc: BASE_URL, priority: "1.0", changefreq: "weekly" },
    { loc: `${BASE_URL}/about`, priority: "0.8", changefreq: "monthly" },
    { loc: `${BASE_URL}/contact`, priority: "0.5", changefreq: "monthly" },
    { loc: `${BASE_URL}/learn`, priority: "0.9", changefreq: "weekly" },
    { loc: `${BASE_URL}/llms.txt`, priority: "0.3", changefreq: "monthly" },
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
    http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls
  .map(
    ({ loc, priority, changefreq }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;
}

// ─── Registration ─────────────────────────────────────────────────────────────

export function registerSeoRoutes(app: Express, distPath: string) {
  // robots.txt — must come before static middleware
  app.get("/robots.txt", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day
    res.type("text/plain").send(ROBOTS_TXT);
  });

  // sitemap.xml
  app.get("/sitemap.xml", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=3600"); // 1 hour
    res.type("application/xml").send(buildSitemap());
  });

  // Per-route meta injection — intercepts known public pages before the
  // generic index.html fallback, injects route-specific metadata, and sends
  // the enriched HTML so crawlers see real title/description/JSON-LD.
  app.use(
    "*",
    (req: Request, res: Response, next: NextFunction) => {
      const route = req.path;
      const meta = PAGE_META[route];
      if (!meta) return next();

      const html = getIndexHtml(distPath);
      if (!html) return next();

      const enriched = injectMeta(html, route, meta);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
      res.send(enriched);
    }
  );
}
