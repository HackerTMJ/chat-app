import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import { ServiceWorkerProvider } from '@/components/providers/ServiceWorkerProvider';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Real-time Chat App",
  description: "A modern real-time chat application built with Next.js and Supabase",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chat App",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "152x152", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "120x120", type: "image/png" }
    ],
    shortcut: "/icon-192x192.png",
  },
  other: {
    'theme-color': '#667eea',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Chat App" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
                <ThemeProvider>
          <ServiceWorkerProvider />
          {children}
          <SpeedInsights />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
