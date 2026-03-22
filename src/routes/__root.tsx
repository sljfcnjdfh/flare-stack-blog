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

function RootDocument({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const env = clientEnv();
  const umamiWebsiteId = env.VITE_UMAMI_WEBSITE_ID;

  // Cookie 授权配置（完整配置，包含隐私政策链接）
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
    website_privacy_policy_url: "https://taiyanglee.eu.org/post/privacy-policy", // 补全隐私政策链接
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
        {/* ========== Cookie 授权核心代码 ========== */}
        {/* TermsFeed Cookie Consent 核心脚本 */}
        <script
          type="text/javascript"
          src="//www.termsfeed.com/public/cookie-consent/4.2.0/cookie-consent.js"
          charSet="UTF-8"
        />
        
        {/* 初始化 Cookie 授权配置 */}
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

        {/* ========== 合规加载第三方脚本（需用户授权） ========== */}
        {/* 1. Umami 统计脚本（tracking 类 Cookie 授权后加载） */}
        {umamiWebsiteId && (
          <script
            type="text/plain"
            data-cookie-consent="tracking"
            src="/stats.js"
            defer
            data-website-id={umamiWebsiteId}
          />
        )}

        {/* 2. 老榕树广告联盟脚本（targeting 类 Cookie 授权后加载） */}
        <script
          type="text/plain"
          data-cookie-consent="targeting"
          src="http://wm.lrswl.com/page/s.php?s=324687&w=950&h=90"
        />

        {/* ========== noscript 降级提示 ========== */}
        <noscript>
          Free cookie consent management tool by{" "}
          <a href="https://www.termsfeed.com/">TermsFeed Generator</a>
        </noscript>

        {/* ========== 原有页面内容 ========== */}
        <ThemeProvider>{children}</ThemeProvider>
        
        {/* ========== Cookie 偏好设置入口 ========== */}
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

        {/* ========== 开发工具 ========== */}
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
