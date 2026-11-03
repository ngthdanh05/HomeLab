import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "../providers/Web3Provider";

export const metadata: Metadata = {
  title: "MyHomeLab — Hệ sinh thái Du lịch số Tuần hoàn & Tái tạo",
  description:
    "Nền tảng Du lịch Tuần hoàn tích hợp AI Assistant, Di sản 360° & Smart Contracts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="font-sans bg-slate-950 text-slate-100 min-h-screen antialiased">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
