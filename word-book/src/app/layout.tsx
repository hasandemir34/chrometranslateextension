import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kelime Defterim — Akıllı Dil Kartları",
  description: "Eklentinizle entegre çalışan, kelimelerinizi kaydedip sesli dinleyebileceğiniz akıllı kelime defteri.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
