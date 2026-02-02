import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexProvider";
import { PrivyAuthProvider } from "@/components/PrivyAuthProvider";
import { AdminShell } from "@/components/layout";
import { Toaster } from "@/components/ui/sonner";
import { AdminProvider } from "@/contexts/AdminContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LTCG Admin Dashboard",
  description: "Admin dashboard for managing LTCG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PrivyAuthProvider>
          <ConvexClientProvider>
            <AdminProvider>
              <AdminShell>{children}</AdminShell>
              <Toaster />
            </AdminProvider>
          </ConvexClientProvider>
        </PrivyAuthProvider>
      </body>
    </html>
  );
}
