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
  title: "FitApp | Treinos e Fichas",
  description:
    "SaaS de fichas e treinos para Personal Trainers — painel profissional e WebApp do aluno.",
  manifest: "/manifest.json",
  // Metatags de PWA:
  //   * appleWebApp.capable → <meta name="apple-mobile-web-app-capable" content="yes">
  //   * viewport.themeColor → <meta name="theme-color" content="#4f46e5">
  appleWebApp: {
    capable: true,
    title: "FitApp",
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
  themeColor: "#4f46e5",
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
