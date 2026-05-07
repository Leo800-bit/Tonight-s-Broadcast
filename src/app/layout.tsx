import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tonight's Broadcast · 今夜广播",
  description:
    "一个深夜AI电台应用。每天自动生成的情绪广播节目，在凌晨陪伴你。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
