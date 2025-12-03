import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "나약사 유튜브 검색기",
  description: "YouTube 트렌드 분석, 콘텐츠 인사이트, AI 기반 추천",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900`}
      >
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 min-h-[calc(100vh-56px)]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
