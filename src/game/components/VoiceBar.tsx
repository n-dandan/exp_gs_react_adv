// src/game/components/VoiceBar.tsx
// 音声入力バー（design.md 4-4）。黒地・上に赤い罫線・マイクは赤い円で脈打つ。
// 波形は声が届いている間だけ振れ、無音になると中央の細い線に収束する。

import { SILENCE_MS } from "../rules";

const WAVE_X = Array.from({ length: 30 }, (_, i) => 10 + i * 20);
// 見た目用の固定パターン（毎レンダーで乱数を引くと落ち着かない）
const WAVE_AMP = [6, 12, 18, 8, 16, 4, 14, 20, 6, 12, 2, 10, 16, 4, 8, 3, 13, 19, 7, 11, 5, 15, 9, 17, 3, 12, 6, 14, 8, 10];

export default function VoiceBar({
  listening,
  hearing,
  disabled,
  onMic,
  onSubmit,
}: {
  listening: boolean;
  hearing: boolean;
  disabled: boolean;
  onMic: () => void;
  onSubmit: () => void;
}) {
  const status = disabled
    ? "書記長が考えている"
    : listening
      ? hearing
        ? "聞いています… 話し終えたら自動で送信"
        : "無音を待っています…"
      : "マイクを押して答える";

  return (
    <div className="voicebar">
      <button
        className={`mic${listening && !disabled ? " mic--live" : ""}`}
        aria-label={listening ? "マイクを止めて送信" : "マイクで話す"}
        onClick={onMic}
        disabled={disabled}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--paper)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <line x1="12" y1="18" x2="12" y2="21" />
          <line x1="8" y1="21" x2="16" y2="21" />
        </svg>
      </button>

      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span className="label" style={{ fontSize: 14 }}>
            {status}
          </span>
          <span className="label" style={{ fontSize: 12, opacity: 0.7 }}>
            無音{SILENCE_MS / 1000}秒で確定
          </span>
        </div>
        <svg className="wave" viewBox="0 0 600 24" preserveAspectRatio="none" style={{ width: "100%", height: 24 }}>
          {WAVE_X.map((x, i) => {
            const amp = listening && hearing ? WAVE_AMP[i] : 2;
            return <line key={x} x1={x} y1={12 - amp / 2} x2={x} y2={12 + amp / 2} />;
          })}
        </svg>
      </div>

      <button
        className="btn btn--sub"
        onClick={onSubmit}
        disabled={disabled || !listening}
        style={{ height: 44, padding: "0 20px", fontSize: 14, flexShrink: 0 }}
      >
        送信
      </button>
    </div>
  );
}
