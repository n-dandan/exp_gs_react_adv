"use client";
// src/app/Recorder.tsx

import { useRef, useState } from "react";

export default function Recorder({ onText }: { onText: (t: string) => void }) {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRec() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.error(e);
      alert("マイクを使えませんでした。ブラウザでマイクを『許可』してください。");
      return;
    }
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "audio.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      onText(data.text); // 文字起こし結果を親に渡す
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  function stopRec() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <button onClick={recording ? stopRec : startRec}>
      {recording ? "■ 録音停止して文字にする" : "🎤 録音する"}
    </button>
  );
}