// src/game/components/ChatLog.tsx
// チャットログ（design.md 4-3）。書記長は左の黒い吹き出し、自分は右の紙色。
// 認識中は点線の斜体、返答待ちは「…」の点滅。

import { useEffect, useRef } from "react";
import type { ChatEntry } from "../types";

export default function ChatLog({
  log,
  interim,
  awaitingAI,
}: {
  log: ChatEntry[];
  /** 音声認識中の暫定テキスト */
  interim: string;
  /** Groq待ち。書記長側に「…」を出す */
  awaitingAI: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新しい吹き出しが増えたら一番下へ
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log.length, interim, awaitingAI]);

  return (
    <div className="log">
      {log.map((entry) =>
        entry.speaker === "secretary" ? (
          <div key={entry.id} className="turnBlock turnBlock--left">
            <div className="label muted">書記長</div>
            <div className="bubble bubble--secretary">
              <span className="star star--red" />
              {entry.text}
            </div>
          </div>
        ) : (
          <div key={entry.id} className="turnBlock turnBlock--right">
            <div className="label muted">あなた</div>
            <div className="bubble bubble--player">{entry.text}</div>
            {(entry.gain !== undefined || entry.faceGain) && (
              <div className="gainLabel">
                疑念 +{(entry.gain ?? 0) + (entry.faceGain ?? 0)}
                {entry.gazeAway ? `　目を逸らした ${entry.gazeAway}回` : ""}
              </div>
            )}
          </div>
        ),
      )}

      {interim !== "" && (
        <div className="turnBlock turnBlock--right">
          <div className="label muted">あなた（認識中）</div>
          <div className="bubble bubble--interim">{interim}</div>
        </div>
      )}

      {awaitingAI && (
        <div className="turnBlock turnBlock--left">
          <div className="label muted">書記長</div>
          <div className="bubble bubble--secretary">
            <span className="star star--red" />
            <span className="thinking" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
