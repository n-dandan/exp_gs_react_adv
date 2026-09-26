// src/game/screens/DiaryScreen.tsx
// 日記画面（Day終了）。wireframes.html「4. 日記」＋design.md（紙色のカード、赤い星と飾り）。

import ScreenFrame from "../components/ScreenFrame";
import PrimaryButton from "../components/PrimaryButton";
import { scenarioOf } from "../scenario";
import { DANGER_AT } from "../rules";
import type { Day } from "../types";

export default function DiaryScreen({
  day,
  suspicion,
  onSleep,
}: {
  day: Day;
  suspicion: number;
  onSleep: () => void;
}) {
  const scenario = scenarioOf(day);

  return (
    <ScreenFrame>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <span className="star star--red" style={{ width: 20, height: 20 }} />
        <div className="cy">Dnevnik</div>
        <div className="display display--section">日記</div>
      </div>

      <div className="card noise" style={{ maxWidth: 760 }}>
        <p style={{ margin: 0, fontSize: 17, lineHeight: 2 }}>{scenario.diary}</p>
      </div>

      <div className="label" style={{ color: suspicion >= DANGER_AT ? "var(--red-deep)" : "var(--gray)" }}>
        疑念 {suspicion} / 100 ・ 日をまたいでも下がらない
      </div>

      <PrimaryButton onClick={onSleep}>{day >= 3 ? "朝を待つ" : "眠る"}</PrimaryButton>
    </ScreenFrame>
  );
}
