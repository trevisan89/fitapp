import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "AURA Training | Treinos e Fichas de Personal",
  description:
    "SaaS white-label de fichas e treinos para Personal Trainers — painel profissional e WebApp do aluno.",
  manifest: "/manifest.json",
  // Metatags de PWA:
  //   * appleWebApp.capable → <meta name="apple-mobile-web-app-capable" content="yes">
  //   * viewport.themeColor → <meta name="theme-color" content="#8b5cf6">
  appleWebApp: {
    capable: true,
    title: "AURA Training",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8b5cf6",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
