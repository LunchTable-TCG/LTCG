import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { PrivyAuthProvider } from "@/components/PrivyAuthProvider";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LunchTable | Weaponized Nostalgia TCG",
  description:
    "Enter the world of LunchTable - a strategic trading card game where adult regret and social hierarchy collide. Collect powerful stereotypes, manage your reputation, and dominate the school.",
  keywords: [
    "LunchTable",
    "TCG",
    "trading card game",
    "card game",
    "strategy game",
    "social hierarchy",
    "underground zine",
  ],
  authors: [{ name: "LunchTable Team" }],
  openGraph: {
    title: "LunchTable | Weaponized Nostalgia TCG",
    description:
      "A high-stakes competitive power fantasy codifying the LunchTable vision.",
    type: "website",
    siteName: "LunchTable",
  },
  twitter: {
    card: "summary_large_image",
    title: "LunchTable | Weaponized Nostalgia TCG",
    description:
      "A high-stakes competitive power fantasy where monsters are replaced by life choices.",
  },
};

import { QueryProvider } from "@/components/providers/QueryProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}
      >
        <PrivyAuthProvider>
          <ConvexClientProvider>
            <QueryProvider>
              <LayoutWrapper>{children}</LayoutWrapper>
            </QueryProvider>
          </ConvexClientProvider>
        </PrivyAuthProvider>
      </body>
    </html>
  );
}
