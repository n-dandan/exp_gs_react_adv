"use client";
// src/app/page.tsx
// 書記長ゲーム 本体。
//
// 画面は1枚のクライアントページ＋phaseの出し分けで作っている。
// Next.jsのルートに分けるとページがアンマウントされ、FaceMeterの片付けが走って
// カメラが落ちてしまう（仕様書はタイトルで許可を取り、以降も使い続ける前提）。
// カメラは画面の外側に固定配置し、会話画面の左カラムと同じ位置計算で重ねている。

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import FaceMeter from "./FaceMeter";
import TitleScreen from "@/game/screens/TitleScreen";
import DayStartScreen from "@/game/screens/DayStartScreen";
import TalkScreen from "@/game/screens/TalkScreen";
import DiaryScreen from "@/game/screens/DiaryScreen";
import ResultScreen from "@/game/screens/ResultScreen";
import { useSpeechRecognition } from "@/game/useSpeechRecognition";
import { gameReducer, initialState } from "@/game/gameReducer";
import { EMPTY_ANSWER, PARSE_FAIL } from "@/game/scenario";
import { DANGER_AT } from "@/game/rules";
import type { FaceFrame } from "@/game/types";

/** 計測した枠の位置。カメラをここに重ねる */
type SlotRect = { el: HTMLElement; left: number; top: number; width: number; height: number };

export default function Home() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [cameraArmed, setCameraArmed] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // カメラは1つのFaceMeterを使い回す（アンマウントするとカメラが落ちるため）。
  // 各画面が「ここに映してほしい」枠を登録し、その位置に固定配置で重ねる。
  const [cameraSlot, setCameraSlot] = useState<HTMLDivElement | null>(null);
  const [slotRect, setSlotRect] = useState<SlotRect | null>(null);

  useEffect(() => {
    const el = cameraSlot;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      setSlotRect({ el, left: r.left, top: r.top, width: r.width, height: r.height });
    };
    // effect内で直接setStateしない（レンダー直後の1フレームで測る）
    const raf = requestAnimationFrame(measure);
    const observer = new ResizeObserver(() => requestAnimationFrame(measure));
    observer.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [cameraSlot]);

  /** face-api の1フレーム。判定は reducer 側で行う */
  const handleFrame = useCallback((frame: FaceFrame) => {
    dispatch({ type: "FRAME", frame });
  }, []);

  // 送信時点のDay・ターン・ゲージをGroqに渡すため、最新のstateをrefで持つ
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  /** 音声・テキストどちらの回答もこの1本を通す */
  const submitAnswer = useCallback(async (raw: string) => {
    const text = raw.trim();
    const { day, turn, suspicion } = stateRef.current;
    dispatch({ type: "SUBMIT_ANSWER", text: text === "" ? "（無音）" : text });

    // 空回答はGroqを呼ばずに固定セリフ（仕様書「音声入力」より suspicion +10）
    if (text === "") {
      window.setTimeout(
        () => dispatch({ type: "AI_REPLY", reply: EMPTY_ANSWER.reply, suspicion: EMPTY_ANSWER.suspicion }),
        800,
      );
      return;
    }

    let judged: { reply: string; suspicion: number } = PARSE_FAIL;
    try {
      const res = await fetch("/api/secretary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, turn, answer: text, suspicion }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.reply === "string" && Number.isFinite(Number(data?.suspicion))) {
          judged = { reply: data.reply, suspicion: Number(data.suspicion) };
        }
      }
    } catch (e) {
      // 通信そのものが失敗しても、固定文でターンを進める
      console.error(e);
    }
    dispatch({ type: "AI_REPLY", reply: judged.reply, suspicion: judged.suspicion });
  }, []);

  const {
    supported: voiceSupported,
    listening,
    interim,
    hearing,
    error: voiceError,
    start: startListening,
    stop: stopListening,
    submitNow,
  } = useSpeechRecognition({ onFinal: submitAnswer });

  const talking = state.phase === "talk";
  const voiceReady =
    talking && !state.awaitingAI && state.turn !== 0 && state.inputMode === "voice" && voiceSupported;

  // 質問が出たら自動でマイクを開く（仕様書：送信後は止め、次のターンで再開する）
  useEffect(() => {
    if (voiceReady && !listening) {
      dispatch({ type: "MIC_ON" });
      startListening();
    }
  }, [voiceReady, listening, startListening]);

  // 会話画面から離れたらマイクを必ず止める
  useEffect(() => {
    if (!talking) {
      stopListening();
      dispatch({ type: "MIC_OFF" });
    }
  }, [talking, stopListening]);

  // マイクが拒否された・ネットワークで落ちた場合はテキスト入力に切り替える
  useEffect(() => {
    if (voiceError) dispatch({ type: "SET_INPUT_MODE", mode: "text" });
  }, [voiceError]);

  function handleMic() {
    if (listening) {
      submitNow();
    } else {
      dispatch({ type: "MIC_ON" });
      startListening();
    }
  }

  const handleCameraReady = useCallback(() => setCameraReady(true), []);

  // 枠を登録している画面（タイトルの許可後と会話中）でだけ映す。
  // 枠の位置を測り終えるまでは出さない（前の画面の位置に一瞬出るのを防ぐ）
  const cameraVisible = cameraArmed && slotRect !== null && slotRect.el === cameraSlot;

  return (
    <>
      {/* カメラは画面遷移の外側に置く。アンマウントするとカメラが落ちるため、
          見せない画面では opacity で隠すだけにして要素は残す */}
      <div
        style={{
          position: "fixed",
          left: slotRect?.left ?? 0,
          top: slotRect?.top ?? 0,
          width: slotRect?.width ?? 0,
          height: slotRect?.height ?? 0,
          zIndex: 30,
          opacity: cameraVisible ? 1 : 0,
          pointerEvents: cameraVisible ? "auto" : "none",
          transition: "opacity 0.35s cubic-bezier(.2,.8,.2,1)",
        }}
        aria-hidden={!cameraVisible}
      >
        {cameraError ? null : (
          <FaceMeter
            armed={cameraArmed}
            active={state.micOn}
            onFrame={handleFrame}
            onReady={handleCameraReady}
            onError={setCameraError}
          />
        )}
      </div>

      {/* 疑念が上がった瞬間の赤いフラッシュ（design.md 6） */}
      {state.flashSeq > 0 && <div key={state.flashSeq} className="flash" />}
      {/* 危険域では画面の縁に赤いビネットを重ねる */}
      {state.suspicion >= DANGER_AT && state.phase !== "gameover" && <div className="vignette" />}
      {/* 画面が切り替わるときの黒いワイプ */}
      <div key={`wipe-${state.phase}-${state.day}`} className="wipe" />

      {state.phase === "title" && (
        <TitleScreen
          cameraArmed={cameraArmed}
          cameraReady={cameraReady}
          cameraError={cameraError}
          cameraSlotRef={setCameraSlot}
          onAllowCamera={() => setCameraArmed(true)}
          onStart={() => dispatch({ type: "START" })}
        />
      )}

      {state.phase === "dayStart" && (
        <DayStartScreen day={state.day} onEnter={() => dispatch({ type: "ENTER_OFFICE" })} />
      )}

      {talking && (
        <TalkScreen
          state={state}
          interim={interim}
          voice={{
            supported: voiceSupported,
            listening,
            hearing,
            error: voiceError,
            onMic: handleMic,
            onSubmitNow: submitNow,
          }}
          cameraSlotRef={setCameraSlot}
          onSubmitText={submitAnswer}
          onSwitchMode={(mode) => {
            if (mode === "text") stopListening();
            dispatch({ type: "SET_INPUT_MODE", mode });
          }}
        />
      )}

      {state.phase === "diary" && (
        <DiaryScreen
          day={state.day}
          suspicion={state.suspicion}
          onSleep={() => dispatch({ type: "SLEEP" })}
        />
      )}

      {(state.phase === "clear" || state.phase === "gameover") && (
        <ResultScreen state={state} onRestart={() => dispatch({ type: "RESET" })} />
      )}
    </>
  );
}
