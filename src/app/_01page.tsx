"use client";
// src/app/page.tsx

import { useState } from "react";

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState("やさしめ"); // ← 追加

  // const topic = "自己紹介を1分で";
  const [topic, setTopic] = useState("自己紹介を1分");

  async function handleSubmit() {
    setLoading(true);
    setFeedback("");

    // 自分のAPI(/api/coach)を呼ぶ（Groqのキーはこの先＝サーバー側にある）
    // 通信やAPI側の失敗で画面が無反応にならないよう try/catch/finally で守る
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, answer, tone }), // ← tone を追加
      });
      const data = await res.json();
      setFeedback(data.feedback ?? "エラーが起きました。もう一度お試しください。");
    } catch {
      setFeedback("通信に失敗しました。ネットワークを確認してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-background mx-auto w-full max-w-2xl p-6">
      <h1 className="bg-primary text-white px-4 py-3 text-2xl font-bold">AI練習コーチ</h1>
      {/* <p>お題：{topic}</p> */}
      <div className=" w-full rounded bg-white p-5 my-4">
        面接の練習内容：
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="自己紹介を1分">自己紹介を1分</option>
          <option value="自己PRを1分">自己PRを1分</option>
          <option value="志望動機">志望動機</option>
          <option value="転職理由">転職理由</option>
          <option value="自分の強み">自分の強み</option>
          <option value="ガクチカ（学生時代に力を入れたこと）">ガクチカ</option>
        </select>
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={5}
        className="w-full rounded border-1 bg-white border-secondary p-2"
        placeholder="ここに回答を入力"
      />

      <div className="w-full rounded bg-white p-5 my-2">
        アドバイスの口調：
        <select value={tone} onChange={(e) => setTone(e.target.value)}>
          <option value="やさしめ">やさしめ</option>
          <option value="スパルタ">スパルタ</option>
          <option value="ていねい">ていねい</option>
        </select>
      </div>

      <button 
        className="bg-accent text-white px-4 py-2 rounded"
        onClick={handleSubmit} disabled={loading} style={{ marginTop: 12 }}>
        {loading ? "生成中…" : "コーチに見てもらう"}
      </button>

      {feedback && (
        <p className="w-full rounded bg-white p-5 mt-8">{feedback}</p>
      )}
    </main>
  );
}