// src/proxy.ts
// Next.js 16 では middleware.ts は proxy.ts に改名されている。
// src/app と同じ階層（= src/ の直下）に置く必要がある。
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  // 認証が必要なパスだけに絞る。
  // 全ルートに通すと、ゲーム画面（/）や Clerk と無関係なAPIまで Clerk の
  // ハンドシェイクを通ることになり、本番の鍵とドメインの組み合わせ次第で
  // サインインへリダイレクトされたり401になる。
  // ゲーム側は認証を使わないので、面接アプリの名残だけを対象にする。
  matcher: [
    "/history",
    "/history/(.*)",
    "/api/sessions",
    "/api/sessions/(.*)",
    "/api/deliver",
  ],
};
