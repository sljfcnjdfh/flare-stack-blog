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
import { getLocale } from "@/paraglide/runtime";
import appCss from "@/styles.css?url";
import { useEffect, useState } from "react";

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

// RSS 文章类型
interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  date: Date;
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const env = clientEnv();
  const umamiWebsiteId = env.VITE_UMAMI_WEBSITE_ID;

  // ==============================================
  // 🔥 新文章检测功能（只在这里加，完全不动 Footer）
  // ==============================================
  const [newArticles, setNewArticles] = useState<RssItem[]>([]);
  const [lastVisit, setLastVisit] = useState<Date | null>(null);
  const [showNewArticles, setShowNewArticles] = useState(false);

  useEffect(() => {
    const now = new Date();
    const lastVisitStr = localStorage.getItem("last_visit_time");
    if (lastVisitStr) {
      const lastTime = new Date(lastVisitStr);
      setLastVisit(lastTime);
      fetchAndCheckNewArticles(lastTime);
    }
    localStorage.setItem("last_visit_time", now.toISOString());
  }, []);

  const fetchAndCheckNewArticles = async (lastTime: Date) => {
    try {
      const res = await fetch("https://taiyanglee.eu.org/rss.xml");
      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");
      const items = xml.querySelectorAll("item");
      const newItems: RssItem[] = [];

      items.forEach((item) => {
        const title = item.querySelector("title")?.textContent || "";
        const link = item.querySelector("link")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || "";
        const date = new Date(pubDate);
        if (date > lastTime) newItems.push({ title, link, pubDate, date });
      });

      if (newItems.length > 0) {
        setNewArticles(newItems);
        setShowNewArticles(true);
      }
    } catch (e) {
      console.log("RSS 加载失败");
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleString("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });

  // Cookie 授权配置
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

        {/* ==============================================
         🔥 新文章提示条（显示在页面底部，不影响布局）
        =============================================== */}
        {showNewArticles && lastVisit && (
          <div
            style={{
              position: "fixed",
              bottom: "70px",
              right: "20px",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "14px 16px",
              fontSize: "13px",
              boxShadow: "0 10px 30px -8px rgba(0,0,0,0.08)",
              zIndex: 999,
              width: "280px",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: "var(--primary)",
                marginBottom: "10px",
                fontSize: "14px",
              }}
            >
              自 {formatTime(lastVisit)} 后新增文章
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {newArticles.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "var(--foreground)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    padding: "4px 2px",
                    transition: "color 0.2s",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.color = "var(--primary)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.color = "var(--foreground)")
                  }
                >
                  • {item.title}
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
