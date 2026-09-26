// src/game/components/GaugeBar.tsx
// 疑念ゲージのバー（design.md 4-2）。
// 色は0〜39が金、40〜69が赤、70〜99が深紅。70の位置に縦線と星を置く。

import { DANGER_AT, MAX_SUSPICION, zoneOf } from "../rules";

export default function GaugeBar({ suspicion }: { suspicion: number }) {
  const zone = zoneOf(suspicion);

  return (
    <div style={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 16 }}>
      <span className="label" style={{ whiteSpace: "nowrap" }}>
        疑念ゲージ
      </span>

      <div className="gauge">
        <div className="gauge__fill" data-zone={zone} style={{ width: `${suspicion}%` }} />
        <div className="gauge__mark" style={{ left: `${DANGER_AT}%` }}>
          <span className="star" />
        </div>
      </div>

      <span className="gauge__value" data-zone={zone}>
        {suspicion} / {MAX_SUSPICION}
      </span>
    </div>
  );
}
