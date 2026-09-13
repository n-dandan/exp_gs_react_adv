"use client";
// app/page.tsx

import { useState } from "react";
import Link from "next/link";
import FaceMeter from "./FaceMeter";

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [smileScore, setSmileScore] = useState(0);
  const [memo, setMemo] = useState("");
  const topic = "自己紹介を1分で";

  async function handleSubmit() {
    setLoading(true);
    setFeedback("");
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, answer, smileScore }),
    });
    const data = await res.json();
    setFeedback(data.feedback);
    setLoading(false);
  }

  async function save() {
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, answer, smileScore, feedback, memo }),
    });
    alert("保存しました");
  }

  async function deliver() {
    const res = await fetch("/api/deliver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback }),
    });
    if (res.ok) alert("メールを送りました");
    else alert("メール送信に失敗しました（無料枠では自分の登録メール宛のみ送れます）");
  }

  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h1>AI練習コーチ</h1>
      <Link href="/history">📖 履歴を見る</Link>

      <FaceMeter onScore={setSmileScore} />
      <p>いまの笑顔率：{smileScore}%</p>

      <p>お題：{topic}</p>
      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} style={{ width: "100%" }} placeholder="ここに回答を入力" />
      <button onClick={handleSubmit} disabled={loading} style={{ marginTop: 12 }}>
        {loading ? "生成中…" : "コーチに見てもらう"}
      </button>

      {feedback && (
        <>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 16 }}>{feedback}</p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            style={{ width: "100%", marginTop: 12 }}
            placeholder="メモ（次回に向けての気づきなど）"
          />
          <button onClick={save}>💾 保存する</button>
           {feedback && <button onClick={deliver}>✉ メールで受け取る</button>}
        </>
      )}
    </main>
  );
}