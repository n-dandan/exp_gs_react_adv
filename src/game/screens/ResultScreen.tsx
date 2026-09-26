// src/game/screens/ResultScreen.tsx
// クリア／ゲームオーバーの結果画面（仕様書「エンディング演出」）。
// どちらの結末でも「最も疑われた発言」を必ず出す（次のプレイで違う答えを試したくなるように）。

import { useEffect, useState } from "react";
import ScreenFrame from "../components/ScreenFrame";
import PrimaryButton from "../components/PrimaryButton";
import { CAUSE_LABEL, CLEAR_TEXT, GAMEOVER_TEXT } from "../scenario";
import type { GameState } from "../types";

/** 余韻：秘書官在任日数が4→5→6と増えて止まる */
function TenureCounter() {
  const [days, setDays] = useState(4);

  useEffect(() => {
    if (days >= 6) return;
    const id = window.setTimeout(() => setDays((d) => d + 1), 900);
    return () => window.clearTimeout(id);
  }, [days]);

  return <div className="label muted">秘書官在任日数：{days}日目</div>;
}

/** 余韻：自分の発言が上から順に黒く塗り潰されていく */
function RedactedLog({ lines }: { lines: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 680, width: "100%" }}>
      {lines.map((line, i) => (
        <div key={`${i}-${line}`} style={{ fontSize: 15 }}>
          <span className="redacted" style={{ animationDelay: `${i * 0.25}s` }}>
            {line}
          </span>
        </div>
      ))}
    </div>
  );
}

function WorstAnswer({ state }: { state: GameState }) {
  // 表情だけで決着すると worstAnswer が無いので、最後の自分の発言で代替する
  const fallback = [...state.log].reverse().find((e) => e.speaker === "player");
  const text = state.worstAnswer?.text ?? fallback?.text;
  const gain = state.worstAnswer?.gain;

  return (
    <div style={{ textAlign: "center" }}>
      <div className="label muted">最も疑われた発言</div>
      <p style={{ margin: "6px 0 0", fontSize: 17 }}>
        {text ? `「${text}」${gain !== undefined ? `（疑念 +${gain}）` : ""}` : "—"}
      </p>
    </div>
  );
}

export default function ResultScreen({
  state,
  onRestart,
}: {
  state: GameState;
  onRestart: () => void;
}) {
  const cleared = state.phase === "clear";
  const playerLines = state.log.filter((e) => e.speaker === "player").map((e) => e.text);

  if (cleared) {
    return (
      <ScreenFrame variant="raysGold">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div className="cy">Result</div>
          <h1 className="display display--large" style={{ color: "var(--black)" }}>
            生存
          </h1>
          <div className="stamp stamp--gold">昇進</div>
        </div>

        <p style={{ margin: 0, fontSize: 18, maxWidth: 560, textAlign: "center" }}>{CLEAR_TEXT}</p>

        <div className="card" style={{ display: "flex", gap: 40, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div className="label muted">最終ゲージ</div>
            <div className="gauge__value" style={{ width: "auto", fontSize: 32 }}>
              {state.suspicion} / 100
            </div>
          </div>
          <div style={{ width: 4, alignSelf: "stretch", background: "var(--black)" }} />
          <div style={{ textAlign: "center" }}>
            <div className="label muted">目を逸らした回数</div>
            <div className="gauge__value" style={{ width: "auto", fontSize: 32 }}>
              {state.gazeAwayCount} 回
            </div>
          </div>
        </div>

        <WorstAnswer state={state} />
        <TenureCounter />

        <PrimaryButton onClick={onRestart} variant="sub">
          もう一度
        </PrimaryButton>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame variant="purge">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div className="cy" style={{ color: "var(--paper)", opacity: 0.7 }}>
          Result
        </div>
        <h1 className="display display--large" style={{ color: "var(--paper)" }}>
          粛清
        </h1>
      </div>

      <div className="label" style={{ color: "var(--paper)" }}>
        Day {state.day} で到達 ・ 決め手：{state.lastCause ? CAUSE_LABEL[state.lastCause] : "—"} ・ 疑念{" "}
        {state.suspicion} / 100 ・ 目を逸らした {state.gazeAwayCount} 回
      </div>

      <p style={{ margin: 0, fontSize: 18, maxWidth: 560, textAlign: "center", color: "var(--paper)" }}>
        {GAMEOVER_TEXT}
      </p>

      <div style={{ color: "var(--paper)", textAlign: "center" }}>
        <div className="label" style={{ opacity: 0.7 }}>
          最も疑われた発言
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 17 }}>
          {state.worstAnswer
            ? `「${state.worstAnswer.text}」（疑念 +${state.worstAnswer.gain}）`
            : ([...state.log].reverse().find((e) => e.speaker === "player")?.text ?? "—")}
        </p>
      </div>

      {/* 発言ログが上から順に塗り潰される */}
      {playerLines.length > 0 && <RedactedLog lines={playerLines} />}

      <PrimaryButton onClick={onRestart} variant="sub">
        もう一度
      </PrimaryButton>
    </ScreenFrame>
  );
}
