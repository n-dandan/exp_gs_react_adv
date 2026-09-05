"use client";
// src/app/page.tsx

import { useRef, useState } from "react";
import FaceMeter from "./FaceMeter";   // ← ① 追加
import Recorder from "./Recorder";

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const topic = "自己紹介を1分で";
  const [smileScore, setSmileScore] = useState(0);   // ← ② 追加
  const [speaking, setSpeaking] = useState(false);

  // 再生中の音声と、音声を作っている最中の通信を「停止」から触れるように覚えておく
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

    async function handleSubmit() {
        stopSpeaking();   // 前の読み上げが残っていたら止めてから作り直す
        setLoading(true);
        setFeedback("");
        const res = await fetch("/api/coach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic, answer, smileScore }), // ← smileScore 追加
        });
        const data = await res.json();
        setFeedback(data.feedback);
        setLoading(false);
    }

    async function speak() {
        setSpeaking(true);   // ★ fetch より前。押した瞬間にボタンを無効化する

        // この読み上げ専用の「中断スイッチ」を作って覚えておく
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: feedback }),
            signal: controller.signal,   // ★ 停止ボタンで通信を打ち切れるようにする
          });
          const data = await res.json();

          // 音声を作っている間に停止されていたら、もう鳴らさない
          if (controller.signal.aborted) return;

          const audio = new Audio("data:audio/mp3;base64," + data.audio);
          audioRef.current = audio;                  // ★ 停止ボタンから止められるように保存
          audio.onended = () => setSpeaking(false);   // ★ 再生し終わったら戻す
          audio.onerror = () => setSpeaking(false);   // ★ 音声が壊れていた場合も戻す

          await audio.play();
        } catch (e) {
          // 停止ボタンによる中断は「失敗」ではないので、何もしない
          if (e instanceof Error && e.name === "AbortError") return;

          console.error(e);
          setSpeaking(false);   // ★ 通信や再生に失敗した場合も戻す
          alert("読み上げに失敗しました。");
        }
    }

    function stopSpeaking() {
        // ① 音声をまだ作っている途中なら、その通信を打ち切る
        abortRef.current?.abort();
        abortRef.current = null;

        // ② すでに鳴っているなら止めて、頭出ししておく
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            audioRef.current = null;
        }

        setSpeaking(false);
    }

  return (
    <main className="bg-background mx-auto w-full max-w-2xl p-6">
      <h1 className="bg-primary text-white px-4 py-3 text-2xl font-bold">AI練習コーチ</h1>
      <FaceMeter className="mx-auto w-full max-w-2xl" onScore={setSmileScore} />
      <div className=" w-full rounded bg-white p-5 my-4">
        <p className={
          smileScore >= 70 ? "text-green-600"
          : smileScore >= 40 ? "text-yellow-600"
          : "text-red-600"
          }>
          {smileScore >= 70 ? "😄" : smileScore >= 40 ? "🙂" : "😐"} いまの笑顔率：{smileScore}% 
        </p>
        {/* <p>いまの笑顔率：{smileScore}%</p> */}
        <p>お題：{topic}</p>
      </div>
      
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={5}
        className="w-full rounded border-1 bg-white border-secondary p-2"
        placeholder="ここに回答を入力"
      />
        <Recorder 
            className="bg-accent text-white px-4 py-2 rounded"
            onText={(t) => setAnswer(t)} 
        />
      <button 
        className="bg-accent text-white px-4 py-2 m-3 rounded"
        onClick={handleSubmit} disabled={loading} style={{ marginTop: 12 }}>
        {loading ? "生成中…" : "コーチに見てもらう"}
      </button>
        {feedback &&
        <>
            <p 
                className="w-full rounded  bg-white p-5"
                style={{ whiteSpace: "pre-wrap", marginTop: 16 }}>{feedback}
            </p>
            <button 
                className="bg-accent text-white px-4 py-2 my-8 rounded"
                onClick={speak} disabled={speaking}>
                {speaking ? "🔊 読み上げ中…" : "🔊 読み上げ"}
            </button>
            {speaking && (
                <button onClick={stopSpeaking} style={{ marginLeft: 8 }}>
                    ⏹ 停止
                </button>
            )}
        </>
        }
    </main>
  );
}
