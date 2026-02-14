import { ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const footerLinks = {
  game: {
    title: "Curriculum",
    links: [
      { href: "/cards", label: "Catalog" },
      { href: "/news", label: "Bulletin Board" },
      { href: "/token", label: "Credits" },
    ],
  },
  developers: {
    title: "Propaganda",
    links: [
      { href: process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.lunchtable.cards", label: "Field Manual", external: true },
      { href: process.env.NEXT_PUBLIC_AGENT_SDK_URL || "https://agents.lunchtable.cards", label: "Agent SDK", external: true },
      { href: process.env.NEXT_PUBLIC_DEV_PORTAL_URL || "https://dev.lunchtable.cards", label: "Portal", external: true },
      { href: process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/LunchTable-TCG/LTCG", label: "Source", external: true },
    ],
  },
  community: {
    title: "Hierarchy",
    links: [
      { href: "/social", label: "The Yard" },
      { href: process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/hgjCJJZh", label: "Broadcast", external: true },
      { href: process.env.NEXT_PUBLIC_TWITTER_URL || "https://x.com/LunchTableTCG", label: "X", external: true },
    ],
  },
  legal: {
    title: "Discipline",
    links: [
      { href: "/terms", label: "Rules" },
      { href: "/privacy", label: "Permanent Record" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="relative border-t-4 border-primary bg-background overflow-hidden scanner-noise">
      <div className="container mx-auto px-6 py-16 relative">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-4 mb-6 group">
              <div className="w-12 h-12 border-4 border-primary flex items-center justify-center grayscale contrast-200">
                <Image
                  src="/assets/logo-icon.png"
                  alt="LT"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <span className="text-xl font-black uppercase tracking-tighter ink-bleed">Lunchtable</span>
                <span className="block text-[10px] text-destructive font-bold tracking-widest uppercase">
                  Regret Chronicle
                </span>
              </div>
            </Link>
            <p className="text-sm font-bold uppercase tracking-tight text-muted-foreground leading-tight">
              A high-stakes competitive power fantasy codifying adult regret.
            </p>
          </div>

          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h3 className="font-black text-foreground mb-6 text-xs uppercase tracking-widest opacity-60">
                {section.title}
              </h3>
              <ul className="space-y-4">
                {section.links.map((link) => {
                  const isExternal = "external" in link && link.external;

                  if (isExternal) {
                    return (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-black uppercase tracking-tighter text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
                        >
                          {link.label}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    );
                  }

                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-xs font-black uppercase tracking-tighter text-muted-foreground hover:text-primary transition-colors"
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

        <div className="h-1 bg-primary mb-8" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            &copy; {new Date().getFullYear()} LunchTable Team. No Regrets.
          </p>
          <div className="flex items-center gap-4">
            <div className="px-2 py-1 border-2 border-primary text-[10px] font-black uppercase">Established 1994</div>
            <div className="px-2 py-1 border-2 border-primary text-[10px] font-black uppercase">Zine-Certified</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
