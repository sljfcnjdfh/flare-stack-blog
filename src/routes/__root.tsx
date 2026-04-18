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
        { charSet: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        { title: loaderData?.siteConfig?.title },
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
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "stylesheet", href: appCss },
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
  newText: string;
}

interface ArticleCacheItem {
  link: string;
  title: string;
  fingerprint: string;
}

const cleanText = (text: string) => {
  return text.replace(/\s+/g, " ").trim();
};

const getFingerprint = (text: string) => {
  return btoa(encodeURIComponent(cleanText(text)));
};

const decodeFingerprint = (fp: string): string => {
  try {
    return decodeURIComponent(atob(fp));
  } catch {
    return "";
  }
};

const getDiffSentences = (oldText: string, newText: string): string[] => {
  const split = (s: string) =>
    s.split(/[。！？；]/).map(t => t.trim()).filter(Boolean);
  const oldArr = split(oldText);
  const newArr = split(newText);
  return newArr.filter(t => !oldArr.includes(t));
};

function RootDocument({ children }: { children: React.ReactNode }) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const env = clientEnv();
  const umamiWebsiteId = env.VITE_UMAMI_WEBSITE_ID;

  const [changes, setChanges] = useState<ArticleChange[]>([]);
  const [showPopup, setShowPopup] = useState(true);
  const [firstVisit, setFirstVisit] = useState(true);

  const CACHE_KEY = "blog_articles_v5";

  const localCache = useMemo<ArticleCacheItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    } catch {
      return [];
    }
  }, []);

  // ==============================
  // ✅ 安全清空提示（只清UI，不清缓存基准）
  // ==============================
  const clearAllUpdates = () => {
    setChanges([]);
    setShowPopup(false);

    // 清除页面高亮
    document.querySelectorAll(".diff-marked").forEach(el => {
      el.classList.remove("diff-marked");
      el.style.background = "";
      el.style.textDecoration = "";
      el.style.textDecorationColor = "";
      el.style.textDecorationThickness = "";
      el.style.textUnderlineOffset = "";
    });

    // 清除提示条
    document.querySelectorAll(".article-update-tip").forEach(el => el.remove());
  };

  const fetchAndDetectChanges = async () => {
    try {
      const res = await fetch("/rss.xml", { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return;
      const text = await res.text();
      const xml = new DOMParser().parseFromString(text, "application/xml");
      const items = xml.querySelectorAll("item");

      const newCache: ArticleCacheItem[] = [];
      const newChanges: ArticleChange[] = [];

      items.forEach(item => {
        const title = item.querySelector("title")?.textContent || "无标题";
        const link = item.querySelector("link")?.textContent || "#";
        const content = item.querySelector("*|encoded")?.textContent || "";
        const fp = getFingerprint(content);

        newCache.push({ link, title, fingerprint: fp });

        const found = localCache.find(x => x.link === link);
        if (!found) {
          newChanges.push({ title, link, isNew: true, isModified: false, newText: content });
        } else if (found.fingerprint !== fp) {
          newChanges.push({ title, link, isNew: false, isModified: true, newText: content });
        }
      });

      localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
      setChanges(newChanges);
    } catch (err) {}
  };

  useEffect(() => {
    const last = localStorage.getItem("last_visit_global");
    if (!last) {
      localStorage.setItem("last_visit_global", new Date().toUTCString());
      setFirstVisit(true);
      fetchAndDetectChanges();
      return;
    }
    setFirstVisit(false);
    fetchAndDetectChanges();
    localStorage.setItem("last_visit_global", new Date().toUTCString());
  }, []);

  // ==============================
  // ✅ 局部修改高亮（只标修改，不标新增）
  // ==============================
  useEffect(() => {
    const path = window.location.pathname;
    const curr = changes.find(x => x.link === path);
    if (!curr || curr.isNew) return;

    const article = document.querySelector(".prose") || document.querySelector(".article-content");
    if (!article || article.querySelector(".diff-marked")) return;

    const cache = localCache.find(x => x.link === path);
    if (!cache) return;

    const oldText = decodeFingerprint(cache.fingerprint);
    const newText = cleanText(curr.newText);
    const diffs = getDiffSentences(oldText, newText);
    if (diffs.length === 0) return;

    const walk = (el: Element) => {
      el.childNodes.forEach(node => {
        if (node.nodeType === 3) {
          let txt = node.textContent || "";
          let changed = false;
          diffs.forEach(seg => {
            if (txt.includes(seg)) {
              changed = true;
              txt = txt.replaceAll(seg,
                `<span class="diff-marked" style="background:rgba(34,197,94,0.12);text-decoration:underline;text-decoration-color:#22c55e;text-decoration-thickness:1px;text-underline-offset:2px;">${seg}</span>`
              );
            }
          });
          if (changed && node.parentNode) {
            const span = document.createElement("span");
            span.innerHTML = txt;
            node.parentNode.replaceChild(span, node);
          }
        } else if (node.nodeType === 1) {
          walk(node as Element);
        }
      });
    };

    walk(article);

    const tip = document.createElement("div");
    tip.style.cssText = "margin:0 0 16px 0;padding:8px 14px;border-left:3px solid #22c55e;background:rgba(34,197,94,0.08);border-radius:6px;font-size:14px;";
    tip.textContent = "✏️ 本文有内容更新，修改段落已标注";
    article.parentNode?.insertBefore(tip, article);
  }, [changes, localCache]);

  const cookie = {
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
    <html lang="zh" suppressHydrationWarning style={theme.getDocumentStyle?.(siteConfig)}>
      <head><HeadContent /></head>
      <body>
        <script src="//www.termsfeed.com/public/cookie-consent/4.2.0/cookie-consent.js" charSet="UTF-8" />
        <script charSet="UTF-8" dangerouslySetInnerHTML={{ __html: `
document.addEventListener('DOMContentLoaded',()=>cookieconsent.run(${JSON.stringify(cookie)}));`}} />

        {umamiWebsiteId && (
          <script type="text/plain" data-cookie-consent="tracking" src="/stats.js" defer data-website-id={umamiWebsiteId} />
        )}

        <script type="text/plain" data-cookie-consent="targeting" src="http://wm.lrswl.com/page/s.php?s=324687&w=950&h=90" />

        <noscript><a href="https://www.termsfeed.com/">TermsFeed</a></noscript>
        <ThemeProvider>{children}</ThemeProvider>

        {/* ============================== */}
        {/* ✅ 弹窗：自动滚动 + 不撑爆屏幕 */}
        {/* ============================== */}
        {!firstVisit && showPopup && changes.length > 0 && (
          <div style={{
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
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontWeight: 600 }}>最新更新</div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={clearAllUpdates} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>🗑️</button>
                <button onClick={() => setShowPopup(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>×</button>
              </div>
            </div>

            {/* ✅ 自动滚动区域，再多文章也不会撑爆屏幕 */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "220px",
              overflowY: "auto",
              paddingRight: "4px",
            }}>
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
                  }}>
                  <span style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    border: "1px solid #f97316",
                    color: "#f97316",
                    borderRadius: "4px",
                  }}>{item.isNew ? "新增" : "更新"}</span>
                  {item.title}
                </a>
              ))}
            </div>
          </div>
        )}

        <a href="#" id="open_preferences_center" style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          fontSize: "12px",
          color: "#666",
          background: "#f5f5f5",
          padding: "4px 8px",
          borderRadius: "4px",
          zIndex: 9999,
          border: "1px solid #eee",
          textDecoration: "none",
        }}>更新Cookie偏好设置</a>

        <TanStackDevtools config={{ position: "bottom-right" }}
          plugins={[
            { name: "Router", render: <TanStackRouterDevtoolsPanel /> },
            TanStackQueryDevtools,
          ]} />
        <Scripts />
      </body>
    </html>
  );
}
