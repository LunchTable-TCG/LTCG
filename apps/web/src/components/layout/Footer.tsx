import { ExternalLink, Flame } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  game: {
    title: "Battle",
    links: [
      { href: "/cards", label: "Card Codex" },
      { href: "/news", label: "Chronicles" },
      { href: "/token", label: "Token" },
    ],
  },
  developers: {
    title: "Developers",
    links: [
      { href: process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.lunchtable.cards", label: "Documentation", external: true },
      { href: process.env.NEXT_PUBLIC_AGENT_SDK_URL || "https://agents.lunchtable.cards", label: "Agent SDK", external: true },
      { href: process.env.NEXT_PUBLIC_DEV_PORTAL_URL || "https://dev.lunchtable.cards", label: "Developer Portal", external: true },
      { href: process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/LunchTable-TCG/LTCG", label: "GitHub", external: true },
    ],
  },
  community: {
    title: "Guild",
    links: [
      { href: "/social", label: "Guild Hall" },
      { href: process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/hgjCJJZh", label: "Discord", external: true },
      { href: process.env.NEXT_PUBLIC_TWITTER_URL || "https://x.com/LunchTableTCG", label: "X", external: true },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="absolute inset-0 bg-linear-to-t from-background to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container mx-auto px-4 py-12 relative">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-5 group">
              <div className="w-10 h-10 tcg-frame-gold rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-primary animate-torch" />
              </div>
              <div>
                <span className="text-lg font-bold gold-gradient">Lunchtable</span>
                <span className="block text-[9px] text-primary/50 font-semibold tracking-widest uppercase">
                  TCG
                </span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The realm awaits. Build your deck, master your cards, claim victory.
            </p>
          </div>

          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider gold-text">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => {
                  const isExternal = "external" in link && link.external;

                  if (isExternal) {
                    return (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
                        >
                          {link.label}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </li>
                    );
                  }

                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="tcg-divider mb-6" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} Lunchtable Games. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/40">Forged in the fires of passion</p>
        </div>
      </div>
    </footer>
  );
}
