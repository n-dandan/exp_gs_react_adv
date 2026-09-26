// src/game/screens/DayStartScreen.tsx
// Day開始画面。wireframes.html「2. Day開始」＋design.md（左下寄せ・背景に歯車）。
// この画面では表情判定を動かさない（マイクOFF＝監視OFFなので自動的にそうなる）。

import ScreenFrame from "../components/ScreenFrame";
import PrimaryButton from "../components/PrimaryButton";
import { scenarioOf } from "../scenario";
import type { Day } from "../types";

/** 装飾の歯車（design.md 3-2。実在のシンボルは使わない） */
function Gear() {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      style={{
        position: "absolute",
        left: "-6%",
        bottom: "-14%",
        width: 420,
        height: 420,
        opacity: 0.08,
        pointerEvents: "none",
      }}
    >
      <g fill="none" stroke="var(--black)" strokeWidth="6">
        <circle cx="50" cy="50" r="26" />
        <circle cx="50" cy="50" r="12" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return (
            <line
              key={i}
              x1={50 + Math.cos(a) * 28}
              y1={50 + Math.sin(a) * 28}
              x2={50 + Math.cos(a) * 40}
              y2={50 + Math.sin(a) * 40}
            />
          );
        })}
      </g>
    </svg>
  );
}

export default function DayStartScreen({ day, onEnter }: { day: Day; onEnter: () => void }) {
  const scenario = scenarioOf(day);

  return (
    <ScreenFrame>
      <Gear />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div className="cy">Day {day} / 3</div>
        <div className="display display--shift display--huge">Day {day}</div>
      </div>

      <div className="card" style={{ maxWidth: 680 }}>
        <p style={{ margin: 0, fontSize: 19, lineHeight: 1.9 }}>{scenario.situation}</p>
      </div>

      <PrimaryButton onClick={onEnter}>執務室へ</PrimaryButton>

      <div className="label muted">この画面では表情判定は動きません</div>
    </ScreenFrame>
  );
}
