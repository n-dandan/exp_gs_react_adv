// src/app/history/layout.tsx
// 練習記録（面接アプリの名残）だけで Clerk を使う。
// ルートレイアウトに ClerkProvider を置くとゲーム画面でも Clerk のブラウザJSが
// 読み込まれてしまうため、認証が必要なこのサブツリーに限定している。

import { ClerkProvider } from "@clerk/nextjs";

export default function HistoryLayout({ children }: LayoutProps<"/history">) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
