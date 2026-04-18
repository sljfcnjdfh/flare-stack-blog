import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import theme from "@theme";
import { ThemeProvider } from "@/components/common/theme-provider";
import { siteConfigQuery } from "@/features/config/queries";
import TanStackQueryDevtools from "@/integrations/tanstack-query/devtools";
import { clientEnv } from "@/lib/env/client.env";
import { getLocale } from "@/paradigm/runtime";
import appCss from "@/styles.css?url";
import { useEffect, useState, useMemo } from "react";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ context }) => {
    const siteConfig =
      await context.queryClient.ensureQueryData(siteConfigQuery);
    return { siteConfig };
  },
  loader: async ({ context }) => {
    return { siteConfig: context.siteConfig };
  },
  head: ({ loaderData }) => {
    const env = clientEnv();

    return {
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: loaderData?.siteConfig?.title,
        },
        {
          name: "description",
          content: loaderData?.siteConfig?.description,
        },
      ],
      links: [
        {
          rel: "icon",
          type: "image/svg+xml",
          href: loaderData?.siteConfig?.icons.faviconSvg,
        },
        {
          rel: "icon",
          type: "image/png",
          href: loaderData?.siteConfig?.icons.favicon96,
          sizes: "96x96",
        },
        {
          rel: "shortcut icon",
          href: loaderData?.siteConfig?.icons.faviconIco,
        },
        {
          rel: "apple-touch-icon",
          type: "image/png",
          href: loaderData?.siteConfig?.icons.appleTouchIcon,
          sizes: "180x180",
        },
        {
          rel: "manifest",
          href: "/site.webmanifest",
        },
        {
          rel: "stylesheet",
          href: appCss,
        },
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: "RSS Feed",
          href: "/rss.xml",
        },
        {
          rel: "alternate",
          type: "application/atom+xml",
          title: "Atom Feed",
          href: "/atom.xml",
        },
        {
          rel: "alternate",
          type: "application/feed+json",
          title: "JSON Feed",
          href: "/feed.json",
        },
      ],
      scripts: [],
    };
  },
  shellComponent: RootDocument,
});

interface ArticleChange {
  title: string;
  link: string;
  isNew: boolean;
  isModified: boolean;
}

interface ArticleCacheItem {
  link: string;
  title: string;
  fingerprint: string;
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const env = clientEnv();
  const umamiWebsiteId = env.VITE_UMAMI_WEBSITE_ID;

  const [changes, setChanges] = useState<ArticleChange[]>([]);
  const [showPopup, setShowPopup] = useState(true);
  const [firstVisit, setFirstVisit] = useState(true);

  const CACHE_KEY = "blog_articles_v5";

  const cleanContent = (html: string) => {
    return html.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
  };

  const getFingerprint = (html: string) => {
    return btoa(encodeURIComponent(cleanContent(html)));
  };

  const localCache = useMemo<ArticleCacheItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    } catch {
      return [];
    }
  }, []);

  const clearAllUpdates = () => {
    setChanges([]);
    setShowPopup(false);
    localStorage.removeItem(CACHE_KEY);
  };

  const fetchAndDetectChanges = async () => {
    try {
      const res = await fetch("https://taiyanglee.eu.org/rss.xml", {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return;
      const text = await res.text();
      const xml = new DOMParser().parseFromString(text, "application/xml");
      const items = xml.querySelectorAll("item");

      const newCache: ArticleCacheItem[] = [];
      const newChanges: ArticleChange[] = [];

      items.forEach((item) => {
        const title = item.querySelector("title")?.textContent || "无标题";
        const link = item.querySelector("link")?.textContent || "#";
        const content =
          item.querySelector("content\\:encoded")?.textContent ||
          item.querySelector("description")?.textContent ||
          "";

        const fingerprint = getFingerprint(content);
        newCache.push({ link, title, fingerprint });

        const found = localCache.find((x) => x.link === link);
        if (!found) {
          newChanges.push({ title, link, isNew: true, isModified: false });
        } else if (found.fingerprint !== fingerprint) {
          newChanges.push({ title, link, isNew: false, isModified: true });
        }
      });

      localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
      setChanges(newChanges);
    } catch (err) {}
  };

  useEffect(() => {
    const lastVisit = localStorage.getItem("last_visit_global");
    if (!lastVisit) {
      localStorage.setItem("last_visit_global", new Date().toUTCString());
      setFirstVisit(true);
      fetchAndDetectChanges();
      return;
    }

    setFirstVisit(false);
    fetchAndDetectChanges();
    localStorage.setItem("last_visit_global", new Date().toUTCString());
  }, []);

  useEffect(() => {
    const currentPath = window.location.pathname;
    const isUpdated = changes.some((item) => item.link === currentPath);
    if (!isUpdated) return;

    const article = document.querySelector(".prose") || document.querySelector(".article-content");
    if (!article) return;

    const textLength = (article.textContent || "").length;
    if (textLength > 8000) {
      const tip = document.createElement("div");
      tip.style.cssText =
        "margin: 0 0 16px 0; padding: 8px 12px; border-left: 3px solid #22c55e; background: var(--accent); border-radius: 6px; font-size: 14px; color: var(--muted-foreground);";
      tip.textContent = "✏️ 本文已更新";
      article.parentNode?.insertBefore(tip, article);
      return;
    }

    (article as HTMLElement).style.textDecoration = "underline";
    (article as HTMLElement).style.textDecorationColor = "#22c55e";
    (article as HTMLElement).style.textDecorationThickness = "1px";
    (article as HTMLElement).style.textUnderlineOffset = "3px";
  }, [changes]);

  const cookieConsentConfig = {
    notice_banner_type: "simple",
    consent_type: "express",
    palette: "dark",
    language: "zh_tw",
    page_load_consent_levels: ["strictly-necessary"],
    notice_banner_reject_button_hide: false,
    preferences_center_close_button_hide: false,
    page_refresh_confirmation_buttons: false,
    website_name: "李帅博客",
    website_privacy_policy_url: "https://taiyanglee.eu.org/post/privacy-policy",
  };

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      style={theme.getDocumentStyle?.(siteConfig)}
    >
      <head>
        <HeadContent />
      </head>
      <body>
        <script
          type="text/javascript"
          src="//www.termsfeed.com/public/cookie-consent/4.2.0/cookie-consent.js"
          charSet="UTF-8"
        />
        <script
          type="text/javascript"
          charSet="UTF-8"
          dangerouslySetInnerHTML={{
            __html: `
document.addEventListener('DOMContentLoaded', function () {
  cookieconsent.run(${JSON.stringify(cookieConsentConfig)});
});
            `,
          }}
        />

        {umamiWebsiteId && (
          <script
            type="text/plain"
            data-cookie-consent="tracking"
            src="/stats.js"
            defer
            data-website-id={umamiWebsiteId}
          />
        )}

        <script
          type="text/plain"
          data-cookie-consent="targeting"
          src="http://wm.lrswl.com/page/s.php?s=324687&w=950&h=90"
        />

        <noscript>
          Free cookie consent management tool by{" "}
          <a href="https://www.termsfeed.com/">TermsFeed Generator</a>
        </noscript>

        <ThemeProvider>{children}</ThemeProvider>

        {!firstVisit && showPopup && changes.length > 0 && (
          <div
            style={{
              position: "fixed",
              bottom: "80px",
              right: "20px",
              width: "320px",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "14px 16px",
              boxShadow: "0 10px 30px -8px rgba(0,0,0,0.08)",
              zIndex: 999,
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--primary)" }}>
                最新更新
              </div>
              <button
                onClick={clearAllUpdates}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                }}
              >
                🗑️
              </button>
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "160px",
                overflowY: "auto",
              }}
            >
              {changes.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--foreground)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 6px",
                      border: "1px solid #f97316",
                      color: "#f97316",
                      borderRadius: "4px",
                    }}
                  >
                    {item.isNew ? "新增" : "更新"}
                  </span>
                  {item.title}
                </a>
              ))}
            </div>
          </div>
        )}

        <a
          href="#"
          id="open_preferences_center"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            fontSize: "12px",
            color: "#666",
            textDecoration: "none",
            background: "#f5f5f5",
            padding: "4px 8px",
            borderRadius: "4px",
            zIndex: 9999,
            border: "1px solid #eee",
          }}
        >
          更新Cookie偏好设置
        </a>

        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
