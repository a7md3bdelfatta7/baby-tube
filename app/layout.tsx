import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppBackdrop } from "@/components/AppBackdrop";
import { QueryProvider } from "@/components/QueryProvider";
import { WatchTimerBar } from "@/components/WatchTimer";
import { Geist, Quicksand } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Tots — little videos for little stars",
  description:
    "Tots is a safe, magical video player for babies and toddlers. Curated by parents, designed to feel warm and playful.",
  applicationName: "Tots",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#C8EFD4",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn("font-sans", geist.variable, quicksand.variable)}
    >
      <body className="relative min-h-screen pb-32">
        <AppBackdrop />
        <QueryProvider>
          {children}
          <WatchTimerBar />
        </QueryProvider>
      </body>
    </html>
  );
}
