import type { Metadata } from "next";
import { Cinzel, Crimson_Text, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { PrivyAuthProvider } from "@/components/PrivyAuthProvider";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";
import { NotificationToast } from "@/components/notifications/NotificationToast";
import { Toaster } from "@/components/ui/toaster";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const crimsonText = Crimson_Text({
  weight: ["400", "600", "700"],
  variable: "--font-crimson",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lunchtable TCG | Strategic Trading Card Game",
  description:
    "Enter the arena of Lunchtable TCG - a strategic trading card game where skill meets strategy. Collect powerful cards, build winning decks, and battle players worldwide.",
  keywords: [
    "TCG",
    "trading card game",
    "card game",
    "strategy game",
    "online card game",
    "Lunchtable",
  ],
  authors: [{ name: "Lunchtable Games" }],
  openGraph: {
    title: "Lunchtable TCG | Strategic Trading Card Game",
    description:
      "Enter the arena of Lunchtable TCG - a strategic trading card game where skill meets strategy.",
    type: "website",
    siteName: "Lunchtable TCG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lunchtable TCG | Strategic Trading Card Game",
    description:
      "Enter the arena of Lunchtable TCG - a strategic trading card game where skill meets strategy.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${crimsonText.variable} antialiased min-h-screen bg-background font-serif`}
      >
        <PrivyAuthProvider>
          <ConvexClientProvider>
            <NotificationToast />
            <LayoutWrapper>{children}</LayoutWrapper>
            <Toaster />
            <FeedbackWidget />
          </ConvexClientProvider>
        </PrivyAuthProvider>
      </body>
    </html>
  );
}
