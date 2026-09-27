// src/game/screens/TitleScreen.tsx
// タイトル画面。レイアウトは wireframes.html「1. タイトル」、見た目は design.md。
// カメラ映像は page.tsx が画面の外側で持っている（画面を移動してもカメラを落とさないため）。

import ScreenFrame from "../components/ScreenFrame";
import PrimaryButton from "../components/PrimaryButton";
import { RULES } from "../scenario";

export default function TitleScreen({
  cameraArmed,
  cameraReady,
  cameraError,
  cameraSlotRef,
  onAllowCamera,
  onStart,
}: {
  cameraArmed: boolean;
  cameraReady: boolean;
  cameraError: string | null;
  /** カメラ映像を重ねる枠。実体は page.tsx が固定配置で持っている */
  cameraSlotRef: (el: HTMLDivElement | null) => void;
  onAllowCamera: () => void;
  onStart: () => void;
}) {
  return (
    <ScreenFrame variant="rays">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div className="cy">Face-Survival Dialogue Game</div>
        <p
          className="display"
          style={{ fontSize: "clamp(18px, 2.6vw, 30px)", color: "var(--red)", margin: 0 }}
        >
          世界一怖い面談
        </p>
        <h1 className="display display--shift display--large">書記長ゲーム</h1>
        <div className="cy" style={{ color: "var(--black)" }}>
          General Secretary
        </div>
        <p style={{ margin: 0, fontSize: 18 }}>書記長の前で、3日間を生き延びろ。</p>
      </div>

      <div style={{ display: "flex", gap: 40, alignItems: "stretch", flexWrap: "wrap", justifyContent: "center" }}>
        {/* ルール3行（固定文）。黒いカードに紙色文字 */}
        <div className="card card--dark" style={{ width: 440 }}>
          <div className="label" style={{ color: "var(--gold)" }}>
            <span className="star" style={{ width: 11, height: 11, marginRight: 8 }} />
            ルール
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {RULES.map((rule, i) => (
              <div key={rule} style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                <span className="label" style={{ fontSize: 20, color: "var(--red)" }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 18 }}>{rule}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: "18px 0 0", fontSize: 13, opacity: 0.8 }}>
            疑念ゲージが100になると粛清（ゲームオーバー）。
          </p>
        </div>

        {/* カメラとマイクの許可 */}
        <div className="card" style={{ width: 380, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
          {cameraError ? (
            <p style={{ margin: 0, fontSize: 14, color: "var(--red-deep)" }}>{cameraError}</p>
          ) : cameraArmed ? (
            <>
              {/* カメラ映像の場所取り。ここに page.tsx が映像を重ねる */}
              <div ref={cameraSlotRef} style={{ width: "100%", aspectRatio: "16 / 9" }} />
              <div className="label">{cameraReady ? "監視の準備ができた" : "カメラを起動しています…"}</div>
              <p style={{ margin: 0, fontSize: 13 }} className="muted">
                書記長の前では、ここに映る顔が見られています。
              </p>
            </>
          ) : (
            <>
              <button className="btn btn--sub" onClick={onAllowCamera} style={{ width: "100%" }}>
                カメラとマイクを許可
              </button>
              <p style={{ margin: 0, fontSize: 13 }} className="muted">
                許可されるまで「出仕する」は押せません。回答は音声で行うため、マイクも使います。
              </p>
            </>
          )}
        </div>
      </div>

      <PrimaryButton onClick={onStart} disabled={!cameraReady}>
        出仕する
      </PrimaryButton>
    </ScreenFrame>
  );
}
