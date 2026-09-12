import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL 
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` 
      : "https://mr-nobody003.github.io"
  ),
  title: "GATE CSE Dashboard",
  description: "Comprehensive GATE CSE Preparation Dashboard",
  openGraph: {
    title: "GATE CSE Dashboard",
    description: "Open-source GATE Computer Science practice and tracking dashboard.",
    url: "https://mr-nobody003.github.io/GATE",
    siteName: "GATE CSE Prep",
    images: [
      {
        url: `${basePath}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "GATE CSE Dashboard Preview",
        type: "image/jpeg",
      }
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GATE CSE Dashboard",
    description: "Open-source GATE Computer Science practice and tracking dashboard.",
    images: [`${basePath}/og-image.jpg`],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GATE Prep",
  },
};

export const viewport = {
  themeColor: "#0a0a0a",
};

import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/Navbar";
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.deferredPWAEvent = null;
            window.addEventListener('beforeinstallprompt', function(e) {
              e.preventDefault();
              window.deferredPWAEvent = e;
            });
          `
        }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300 relative">
        <div 
          className="fixed inset-0 z-[-1] opacity-[0.75] dark:opacity-[0.10] pointer-events-none"
          style={{
            backgroundImage: `url('${basePath}/bg.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Navbar />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
