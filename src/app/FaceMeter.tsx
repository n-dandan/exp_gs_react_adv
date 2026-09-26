"use client";
// src/app/FaceMeter.tsx
// 講座アプリの検出ループをそのまま使い、取り出す値を増やしただけのもの。
// 仕様書「表情・顔向き判定（face-api）」より：
//   - 使うモデルは検出モデルと表情モデルのみ（追加モデル不要）
//   - 推論は200ms間隔
//   - 判定は発話中（マイクON中）だけ動かす
// 判定そのものは行わず、観測値を onFrame で親に渡す（加算は gameReducer に集約）。

import { useEffect, useRef, useState } from "react";
import { DETECT_INTERVAL_MS } from "@/game/rules";
import type { FaceFrame } from "@/game/types";

export default function FaceMeter({
  armed = true,
  active,
  onFrame,
  onReady,
  onError,
  debug = false,
  className,
}: {
  /** false の間はカメラを起動しない（タイトル画面で許可を取るまで） */
  armed?: boolean;
  /** true の間だけ推論する（マイクON中＝疑念ゲージの「発話中」） */
  active: boolean;
  onFrame: (frame: FaceFrame) => void;
  /** カメラとモデルの準備ができた */
  onReady?: () => void;
  /** カメラが使えなかった。alert を出さず画面に表示する */
  onError?: (message: string) => void;
  /** しきい値調整用に観測値を表示する */
  debug?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [latest, setLatest] = useState<FaceFrame | null>(null);

  // コールバックはrefに退避する。
  // 依存配列に入れると、親が再レンダーするたびにカメラが再起動してしまう。
  const onFrameRef = useRef(onFrame);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onFrameRef.current = onFrame;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  });

  // active も同じ理由でrefで見る（切り替えでカメラを落とさないため）
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!armed) return;

    let timer: ReturnType<typeof setInterval>;
    let stream: MediaStream | null = null; // 片付けでカメラを止めるために保持
    let cancelled = false; // 片付け済みなら以降の処理をやめる印
    let busy = false; // 推論が200msを超えたときにティックが重なるのを防ぐ
    let lastAt: number | null = null; // 前フレームの時刻（経過msの計算用）

    async function start() {
      // ① face-api を "ブラウザで動き始めてから" 読み込む
      const faceapi = await import("@vladmandic/face-api");

      // ② モデルを読み込む（public/models から。仕様書どおり追加モデルは無し）
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");
      if (cancelled) return;

      // ③ カメラを起動して video に流す
      try {
        // マイクの許可もここで一緒に取る（仕様書：タイトル画面でカメラと同時に取る）。
        // 音声トラックはすぐ止める。掴み続けると音声認識と競合する。
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getAudioTracks().forEach((t) => t.stop());
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // srcObject 代入だけだと再生されず真っ黒な環境がある。
          // .catch() は開発モードの2回実行で出る AbortError を無視するため
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.error(e);
        onErrorRef.current?.(
          "カメラを使えませんでした。アドレスバーでカメラを『許可』してから、ページを再読み込みしてください。",
        );
        return;
      }

      onReadyRef.current?.();

      // ④ 200msごとに表情と顔の位置を測る（発話中のみ）
      timer = setInterval(async () => {
        const video = videoRef.current;
        if (!video) return;

        // 発話中でなければ推論しない（CPUを使わない・ゲージも動かない）
        if (!activeRef.current) {
          lastAt = null;
          return;
        }
        // 前のティックの推論が終わっていなければ飛ばす
        if (busy) return;
        // 映像の準備ができるまで待つ
        if (video.readyState < 2 || video.videoWidth === 0) return;

        busy = true;
        try {
          const result = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

          const now = performance.now();
          // 「1秒ごと」はフレーム数ではなく実経過msで数える（飛んだフレームの影響を受けない）
          const dtMs = lastAt === null ? DETECT_INTERVAL_MS : now - lastAt;
          lastAt = now;

          let frame: FaceFrame;
          if (result) {
            // relativeBox は 0〜1 に正規化された矩形。
            // box（実解像度の座標）を video の表示サイズで割るとズレるので、こちらを使う。
            const box = result.detection.relativeBox;
            const e = result.expressions;
            frame = {
              found: true,
              happy: e.happy,
              fearful: e.fearful,
              surprised: e.surprised,
              disgusted: e.disgusted,
              offsetX: Math.abs(box.x + box.width / 2 - 0.5),
              offsetY: Math.abs(box.y + box.height / 2 - 0.5),
              dtMs,
            };
          } else {
            // 顔が見つからないフレームも「目を逸らした」として扱う（捨てない）
            frame = {
              found: false,
              happy: 0,
              fearful: 0,
              surprised: 0,
              disgusted: 0,
              offsetX: 0.5,
              offsetY: 0.5,
              dtMs,
            };
          }

          if (!cancelled) {
            onFrameRef.current(frame);
            setLatest(frame);
          }
        } finally {
          busy = false;
        }
      }, DETECT_INTERVAL_MS);
    }

    start();

    // 片付け（画面を離れたとき／開発モードの2回目実行の前に呼ばれる）
    return () => {
      cancelled = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop()); // カメラを止める（ランプが消える）
    };
  }, [armed]);

  return (
    <div className={`camera${active && latest && !latest.found ? " camera--lost" : ""}${className ? ` ${className}` : ""}`}>
      <video ref={videoRef} autoPlay muted playsInline />

      {/* 「見られている」感を出すラベル（design.md 4-6） */}
      <span className="camera__tag">監視中</span>

      <span className="camera__status">
        {!active
          ? "待機"
          : latest === null
            ? "起動中"
            : latest.found
              ? `顔検出 OK ／ ずれ ${(latest.offsetX * 100).toFixed(0)}% ${(latest.offsetY * 100).toFixed(0)}%`
              : "顔が見えない"}
      </span>

      {debug && latest && active && (
        <span className="camera__status" style={{ right: "auto", left: 0, bottom: 22 }}>
          happy {latest.happy.toFixed(2)} ／ fear {latest.fearful.toFixed(2)} ／ surp{" "}
          {latest.surprised.toFixed(2)} ／ disg {latest.disgusted.toFixed(2)}
        </span>
      )}
    </div>
  );
}
