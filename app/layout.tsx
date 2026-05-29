import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AppBackdrop } from "@/components/AppBackdrop";
import { QueryProvider } from "@/components/QueryProvider";
import { WatchTimerBar } from "@/components/WatchTimer";
import { Geist, Quicksand } from "next/font/google";
import { cn, isTvUserAgent } from "@/lib/utils";

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

// Runs before first paint as a fallback when the server cannot see the UA
// (e.g. cached/streamed HTML). Keeps TV browsers out of the heavy-effects path.
const REDUCE_FX_BOOTSTRAP = `(function(){try{var d=document.documentElement;var ua=navigator.userAgent||"";if(/\\b(SMART-?TV|SmartTV|Tizen|Web0S|webOS|HbbTV|NetCast|VIDAA|BRAVIA|AppleTV|CrKey|GoogleTV|PlayStation|Xbox)\\b/i.test(ua)){d.classList.add("reduce-fx");}}catch(e){}})();`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userAgent = (await headers()).get("user-agent");
  const reduceFx = isTvUserAgent(userAgent);

  return (
    <html
      lang="en"
      className={cn(
        "font-sans",
        geist.variable,
        quicksand.variable,
        reduceFx && "reduce-fx",
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: REDUCE_FX_BOOTSTRAP }} />
      </head>
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
