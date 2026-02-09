import { Cinzel, Crimson_Text } from "next/font/google";
import "../globals.css";
import { StreamConvexProvider } from "./providers";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const crimsonText = Crimson_Text({
  weight: ["400", "600", "700"],
  variable: "--font-crimson",
  subsets: ["latin"],
});

/**
 * Minimal layout for streaming overlays.
 * No Privy auth, no LayoutWrapper — just a bare ConvexProvider
 * so overlay pages can subscribe to queries without authentication.
 */
export default function StreamLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${crimsonText.variable}`}>
        <StreamConvexProvider>{children}</StreamConvexProvider>
      </body>
    </html>
  );
}
