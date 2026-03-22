import { Link, useRouteContext } from "@tanstack/react-router";
import {
  resolveSocialHref,
  SOCIAL_PLATFORMS,
} from "@/features/config/utils/social-platforms";
import type { NavOption } from "@/features/theme/contract/layouts";
import { m } from "@/paraglide/messages";

interface FooterProps {
  navOptions: Array<NavOption>;
}

export function Footer({ navOptions }: FooterProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });

  return (
    <footer className="border-t border-border/40 bg-background/50 py-16 mt-32">
      <div className="max-w-3xl mx-auto px-6 md:px-0 flex flex-col md:flex-row justify-between items-center gap-8">
        {/* Brand / Copyright */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="font-serif text-lg font-bold tracking-tighter text-foreground">
            [ {siteConfig.theme.default.navBarName} ]
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
            {m.footer_copyright({
              year: new Date().getFullYear().toString(),
              author: siteConfig.author,
            })}
          </span>
        </div>

        {/* Minimalist Links */}
        <nav className="flex items-center gap-8 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
          {navOptions.map((option) => (
            <Link
              key={option.id}
              to={option.to}
              className="hover:text-foreground transition-colors"
            >
              {option.label}
            </Link>
          ))}
          {/* 新增：隐私政策链接 */}
          <a
            href="https://taiyanglee.eu.org/post/privacy-policy"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            隐私政策
          </a>
          {/* 新增：Cookie政策链接 */}
          <a
            href="https://taiyanglee.eu.org/post/cookie-policy"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Cookie政策
          </a>
          {/* 原有社交链接逻辑（完全保留） */}
          {siteConfig.social
            .filter((link) => link.url)
            .map((link, i) => {
              const href = resolveSocialHref(link.platform, link.url);
              const label =
                link.platform !== "custom"
                  ? SOCIAL_PLATFORMS[link.platform].label
                  : (link.label ?? "");
              return (
                <a
                  key={`${link.platform}-${i}`}
                  href={href}
                  target={link.platform === "email" ? undefined : "_blank"}
                  rel={link.platform === "email" ? undefined : "noreferrer"}
                  className="hover:text-foreground transition-colors"
                >
                  {label}
                </a>
              );
            })}
        </nav>
      </div>
    </footer>
  );
}
