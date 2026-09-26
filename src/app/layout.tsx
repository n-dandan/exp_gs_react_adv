// src/app/layout.tsx
import type { Metadata } from "next";
import { Dela_Gothic_One, Noto_Sans_JP, Oswald, Russo_One } from "next/font/google";
import "./globals.css";

// design.md「2. タイポグラフィ」の4書体。
// <link> ではなく next/font で読み込む（Googleへのリクエストが消え、FOUTも出ない）。
// subsets は preload する <link> を決めるだけで、日本語グリフは CSS 内の
// @font-face からダウンロードされるため "latin" で問題ない。
const dela = Dela_Gothic_One({ weight: "400", subsets: ["latin"], variable: "--font-dela" });
const russo = Russo_One({ weight: "400", subsets: ["latin"], variable: "--font-russo" });
const noto = Noto_Sans_JP({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-noto" });
const oswald = Oswald({ weight: ["500", "700"], subsets: ["latin"], variable: "--font-oswald" });

export const metadata: Metadata = {
  title: "書記長ゲーム",
  description: "書記長の前で、3日間を生き延びろ。表情と声で疑念ゲージが動く対話ゲーム。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // ClerkProvider はここには置かない。
  // 置くとゲーム画面でも Clerk のブラウザJSが読み込まれ、
  // 拡張機能やネットワーク環境によってはコンソールにエラーが出る。
  // 認証が必要なのは /history だけなので、そちらの layout.tsx に置いている。
  // （API側の auth() は proxy.ts の clerkMiddleware があれば動くので Provider は不要）
  return (
    <html
      lang="ja"
      className={`${dela.variable} ${russo.variable} ${noto.variable} ${oswald.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
