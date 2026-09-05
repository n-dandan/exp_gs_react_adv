"use client";
// src/app/FaceMeter.tsx

import { useEffect, useRef, useState } from "react";

export default function FaceMeter({ onScore }: { onScore: (n: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [smile, setSmile] = useState(0);
  const borderClass =
    smile >= 70 ? "border-green-500"
    : smile >= 40 ? "border-yellow-400"
    : "border-red-500";


  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    let stream: MediaStream | null = null; // 片付けでカメラを止めるために保持
    let cancelled = false;                 // 片付け済みなら以降の処理をやめる印

    async function start() {
      // ① face-api を "ブラウザで動き始めてから" 読み込む（重要・下の⚠️参照）
      const faceapi = await import("@vladmandic/face-api");

      // ② モデルを読み込む（public/models から）
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");
      if (cancelled) return; // 読み込み中に画面を離れていたら、ここで終わる

      // ③ カメラを起動して video に流す
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop()); // 使わないので即止める
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // ← srcObject 代入だけだと再生されず真っ黒な環境がある
          // ← .catch() は「開発モードの2回実行」で出る AbortError を無視するため
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.error(e);
        alert("カメラを使えませんでした。ブラウザのアドレスバーでカメラを『許可』してから、ページを再読み込みしてください。");
        return;
      }

      // ④ 0.5秒ごとに表情を測る
      timer = setInterval(async () => {
        if (!videoRef.current) return;
        const result = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();
        if (result) {
          const happy = Math.round(result.expressions.happy * 100);
          setSmile(happy);
          onScore(happy); // 親(page.tsx)にも笑顔率を渡す
        }
      }, 500);
    }

    start();
    // 片付け（画面を離れたとき／開発モードの2回目実行の前に呼ばれる）
    return () => {
      cancelled = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop()); // ★カメラを止める（ランプが消える）
    };
    // onScore は常に setSmileScore を渡す（インライン関数にすると毎回カメラが再起動するので注意）
  }, []);

  return (
    <div>
      <video
        ref={videoRef}
        className={`border-10 ${borderClass}`}
        autoPlay muted playsInline width={320} height={240}
      />
      <p>{smile >= 70 ? "😄" : smile >= 40 ? "🙂" : "😐"} 笑顔 {smile}%</p>
    </div>
  );
}