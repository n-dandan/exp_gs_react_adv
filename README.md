This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## このリポジトリについて

面接練習アプリ（講座課題）を土台に、`docs/` の仕様書に沿って「書記長ゲーム」へ改造したものです。

### ゲーム本体

| 場所 | 役割 |
| --- | --- |
| `src/app/page.tsx` | ゲーム本体。1枚のクライアントページ＋`phase`で画面を出し分ける |
| `src/app/FaceMeter.tsx` | face-api の検出ループ。発話中だけ200ms間隔で表情と顔の位置を測る |
| `src/game/rules.ts` | **しきい値と加算値。ゲームの難易度調整はこのファイルだけで完結する** |
| `src/game/gameReducer.ts` | 状態遷移。疑念ゲージの加算は `applyGain()` 1本に集約 |
| `src/game/scenario.ts` | 3日分のシナリオ（仕様書から改変せずに写したもの） |
| `src/game/useSpeechRecognition.ts` | Web Speech API による音声入力（Chrome / Edge 前提） |
| `src/app/api/secretary/route.ts` | Groqに書記長の返答と怪しさ判定をさせる。必ず `{reply, suspicion}` を返す |

`.env.local` に `GROQ_API_KEY` が必要です。

### 面接アプリの名残（ゲームからは使っていません）

講座で作った機能をそのまま残しています。ゲームの動作には関与しません。

- `/history`、`/api/sessions` … Neon + Drizzle の練習記録（Clerk認証つき）
- `/api/coach` … 面接フィードバック生成（テキストを返す旧ルート）
- `/api/deliver` … Resend でのメール送信
- `/api/transcribe`、`src/app/Recorder.tsx` … Groq Whisper での文字起こし（音声入力の第2案）
- `/api/tts` … 音声合成（今回のスコープ外）

これらを動かすには `DATABASE_URL` / Clerk の2つのキー / `RESEND_API_KEY` が必要です。
