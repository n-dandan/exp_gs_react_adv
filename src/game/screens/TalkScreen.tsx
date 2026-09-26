// src/game/screens/TalkScreen.tsx
// 会話画面。レイアウトは wireframes.html「3. 会話（メイン）」、見た目は design.md。
// 上部に疑念ゲージ、左に書記長の肖像とカメラ、右にチャットログと音声入力バー。
// カメラの実体は page.tsx が画面の外側で固定配置している（画面遷移でカメラを落とさないため）。

import { useState } from "react";
import GaugeBar from "../components/GaugeBar";
import ChatLog from "../components/ChatLog";
import VoiceBar from "../components/VoiceBar";
import type { GameState } from "../types";

export type VoiceProps = {
  supported: boolean;
  listening: boolean;
  hearing: boolean;
  error: string | null;
  onMic: () => void;
  onSubmitNow: () => void;
};

/**
 * 書記長の肖像。
 * public/portrait.png があればそれを使い、無ければ紙色のシルエット（下のSVG）を出す。
 * 画像を差し替えたいときは public/portrait.png を置くだけでよい。
 */
const PORTRAIT_SRC = "/portrait.png";

function Portrait({ eyesHitKey }: { eyesHitKey: number }) {
  const [imageBroken, setImageBroken] = useState(false);

  return (
    <div className="portrait">
      {!imageBroken ? (
        // eslint-disable-next-line @next/next/no-img-element -- 差し替え前は404になるため onError でSVGに戻す
        <img
          src={PORTRAIT_SRC}
          alt="書記長の肖像"
          onError={() => setImageBroken(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
      <svg viewBox="0 0 200 260" aria-label="書記長の肖像" style={{ width: "72%", maxHeight: "86%" }}>
        {/* 肩 */}
        <path d="M10 260 C10 196 55 172 100 172 C145 172 190 196 190 260 Z" fill="var(--paper)" />
        {/* 襟 */}
        <path d="M100 172 L124 260 L140 260 L112 170 Z" fill="var(--black)" />
        <path d="M100 172 L76 260 L60 260 L88 170 Z" fill="var(--black)" />
        {/* 頭 */}
        <ellipse cx="100" cy="104" rx="52" ry="62" fill="var(--paper)" />
        {/* 髪 */}
        <path d="M48 96 C52 48 148 48 152 96 C140 72 60 72 48 96 Z" fill="var(--black)" />
        {/* 口ひげ */}
        <path d="M76 128 C88 120 112 120 124 128 C112 126 88 126 76 128 Z" fill="var(--black)" />
        {/* 目 */}
        <ellipse cx="80" cy="100" rx="6" ry="4" fill="var(--black)" />
        <ellipse cx="120" cy="100" rx="6" ry="4" fill="var(--black)" />
        {/* 勲章 */}
        <circle cx="150" cy="214" r="10" fill="var(--gold)" />
      </svg>
      )}
      {/* 疑念が上がった瞬間だけ目の位置に赤い線が走る（design.md 4-5） */}
      <div key={eyesHitKey} className="portrait__eyes portrait__eyes--hit" />
      <div className="portrait__cy cy" style={{ fontSize: 11 }}>
        Tovarishch Sekretar
      </div>
    </div>
  );
}

export default function TalkScreen({
  state,
  interim,
  voice,
  cameraSlotRef,
  onSubmitText,
  onSwitchMode,
}: {
  state: GameState;
  interim: string;
  voice: VoiceProps;
  /** カメラ映像を重ねる枠。実体は page.tsx が固定配置で持っている */
  cameraSlotRef: (el: HTMLDivElement | null) => void;
  onSubmitText: (text: string) => void;
  onSwitchMode: (mode: "voice" | "text") => void;
}) {
  const [draft, setDraft] = useState("");
  const locked = state.awaitingAI;
  const textMode = state.inputMode === "text" || !voice.supported;

  function submitText() {
    if (locked) return;
    onSubmitText(draft);
    setDraft("");
  }

  return (
    <div
      style={{
        height: "100dvh",
        maxWidth: 1440,
        margin: "0 auto",
        boxSizing: "border-box",
        padding: "24px 40px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* ヘッダー帯：Day・ターン・疑念ゲージ・監視ランプ */}
      <div
        className="card card--flat"
        style={{ display: "flex", alignItems: "center", gap: 24, height: 60, padding: "0 20px", background: "var(--paper)" }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "baseline", width: 210 }}>
          <span className="display" style={{ fontSize: 22 }}>
            Day {state.day}
          </span>
          <span className="label muted">ターン {state.turn} / 3</span>
        </div>

        <GaugeBar suspicion={state.suspicion} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, width: 116, justifyContent: "flex-end" }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: state.micOn ? "var(--red)" : "var(--gray)",
              borderRadius: "50%",
            }}
          />
          <span className="label">監視中</span>
        </div>
      </div>

      <div style={{ flexGrow: 1, display: "flex", gap: 20, minHeight: 0 }}>
        {/* 左：肖像とカメラ */}
        <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 16, flexShrink: 0 }}>
          <Portrait eyesHitKey={state.flashSeq} />
          {/* カメラの場所取り。実体は page.tsx が固定配置している */}
          <div ref={cameraSlotRef} style={{ height: 200, flexShrink: 0 }} aria-hidden />
        </div>

        {/* 右：チャットログと入力 */}
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
          <ChatLog log={state.log} interim={interim} awaitingAI={state.awaitingAI} />

          {textMode ? (
            <div
              className="card card--flat"
              style={{ background: "var(--paper)", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div className="label muted">
                {voice.supported
                  ? "テキストで回答"
                  : (voice.error ?? "このブラウザでは音声入力が使えません（Chrome / Edge を推奨）")}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitText();
                  }}
                  rows={2}
                  disabled={locked}
                  placeholder="書記長に答える（⌘/Ctrl + Enter で送信）"
                  style={{
                    flexGrow: 1,
                    border: "3px solid var(--black)",
                    background: "var(--paper-dark)",
                    color: "var(--black)",
                    padding: 8,
                    fontFamily: "inherit",
                    fontSize: 16,
                    resize: "none",
                  }}
                />
                <button className="btn" onClick={submitText} disabled={locked} style={{ padding: "0 24px" }}>
                  {locked ? "……" : "送信"}
                </button>
              </div>
            </div>
          ) : (
            <VoiceBar
              listening={voice.listening}
              hearing={voice.hearing}
              disabled={locked}
              onMic={voice.onMic}
              onSubmit={voice.onSubmitNow}
            />
          )}

          {/* 入力方法の切り替え（仕様書：テキストはマイク不可時のフォールバック） */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }} className="muted">
            <span>
              {textMode
                ? "マイクが使える場合は音声入力の方が速い"
                : "マイクが使えない場合のみ、右の「テキストで入力」に切り替え"}
            </span>
            {voice.supported && (
              <button className="linkish" onClick={() => onSwitchMode(textMode ? "voice" : "text")}>
                {textMode ? "音声で入力" : "テキストで入力"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
