// src/game/types.ts
// ゲーム全体で使う型。値（しきい値・点数）は rules.ts、テキストは scenario.ts に置く。

/** 画面。仕様書「画面仕様」＋ wireframes.html の6セクションに対応 */
export type Phase = "title" | "dayStart" | "talk" | "diary" | "clear" | "gameover";

/** 1〜3日目 */
export type Day = 1 | 2 | 3;

/** 0 = 導入だけ表示、1〜3 = 質問中（1Day3問） */
export type Turn = 0 | 1 | 2 | 3;

/** 疑念ゲージが上がった理由。結果画面の「決め手」になる */
export type Cause = "gaze" | "expression" | "smile" | "answer";

/** チャットログの1件 */
export type ChatEntry = {
  id: number;
  speaker: "secretary" | "player";
  text: string;
  /** 書記長の発言の内訳 */
  kind?: "intro" | "question" | "reply" | "final";
  /** 以下はプレイヤーの発言のみ */
  gain?: number; // AI判定による加算
  faceGain?: number; // この発話中の表情由来の加算合計
  gazeAway?: number; // この発話中に目を逸らした回数
};

/** FaceMeter が 200ms ごとに親へ渡す1フレーム分の観測値（Step4で使う） */
export type FaceFrame = {
  /** 顔を検出できたか。false は「目を逸らした」扱い */
  found: boolean;
  happy: number;
  fearful: number;
  surprised: number;
  disgusted: number;
  /** 顔の中心が画面中央からどれだけ離れているか（0〜0.5、relativeBox基準） */
  offsetX: number;
  offsetY: number;
  /** 前フレームからの実経過ms。1秒の積算に使う */
  dtMs: number;
};

export type GameState = {
  // ── 進行 ──
  phase: Phase;
  day: Day;
  turn: Turn;

  // ── 疑念ゲージ（唯一の真実） ──
  suspicion: number; // 0〜100
  lastCause: Cause | null; // = 結果画面の「決め手」
  flashSeq: number; // 加算のたびに+1。赤フラッシュ演出の再生トリガー

  // ── 会話 ──
  log: ChatEntry[];
  nextId: number;
  awaitingAI: boolean; // Groq待ち。「……」表示と入力の無効化に使う
  micOn: boolean; // マイクON＝表情監視ON区間
  inputMode: "voice" | "text";

  // ── ターン内の集計（表情由来の上限判定用） ──
  faceGainThisTurn: number;
  streakMs: { gaze: number; expression: number; smile: number };
  gazeEpisodeOpen: boolean;
  gazeAwayThisTurn: number;

  // ── 通算（結果画面用） ──
  gazeAwayCount: number;
  worstAnswer: { text: string; gain: number } | null;
};
