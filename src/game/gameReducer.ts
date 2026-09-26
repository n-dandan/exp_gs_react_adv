// src/game/gameReducer.ts
// ゲームの状態遷移をここ1か所に集める。
// 疑念ゲージを書き換える経路は「表情（200msごと）」と「Groqの判定」の2つあり、
// 仕様書はその両方でゲームオーバー判定をするよう求めている。
// useState の setter を2か所に書くと「加算後の値を見て画面を切り替える」が書けないため、
// reducer にして加算を applyGain() 1本に集約する。

import { GAMEOVER_LINES, scenarioOf } from "./scenario";
import {
  AI_SUSPICION_MAX,
  FACE_GAIN_CAP_PER_TURN,
  GAIN,
  MAX_SUSPICION,
  STREAK_MS,
  isFinalQuestion,
  thresholdsFor,
} from "./rules";
import type { Cause, ChatEntry, Day, FaceFrame, GameState, Turn } from "./types";

/** 表情由来の加算の種類（この順に判定する） */
const FACE_CAUSES = ["gaze", "expression", "smile"] as const;

export const initialState: GameState = {
  phase: "title",
  day: 1,
  turn: 0,

  suspicion: 0,
  lastCause: null,
  flashSeq: 0,

  log: [],
  nextId: 1,
  awaitingAI: false,
  micOn: false,
  inputMode: "voice",

  faceGainThisTurn: 0,
  streakMs: { gaze: 0, expression: 0, smile: 0 },
  gazeEpisodeOpen: false,
  gazeAwayThisTurn: 0,

  gazeAwayCount: 0,
  worstAnswer: null,
};

export type GameAction =
  /** タイトル画面の「出仕する」 */
  | { type: "START" }
  /** Day開始画面から会話へ。導入と質問1をログに積む */
  | { type: "ENTER_OFFICE" }
  /** 日記画面の「眠る」。次のDayへ、Day3ならクリアへ */
  | { type: "SLEEP" }
  /** 回答を送信（音声・テキストのどちらもここを通る） */
  | { type: "SUBMIT_ANSWER"; text: string }
  /** Groqの判定が返ってきた */
  | { type: "AI_REPLY"; reply: string; suspicion: number }
  /** マイクON＝表情監視ONの区間に入る */
  | { type: "MIC_ON" }
  /** マイクOFF（送信せずに中断した場合） */
  | { type: "MIC_OFF" }
  /** face-api の1フレーム分の観測値（発話中のみ200msごとに届く） */
  | { type: "FRAME"; frame: FaceFrame }
  /** 音声とテキストの切り替え */
  | { type: "SET_INPUT_MODE"; mode: "voice" | "text" }
  /** 動作確認用に手でゲージを増やす（Step4で表情ループに置き換える） */
  | { type: "GAIN"; cause: Cause; points?: number }
  | { type: "RESET" };

/** ログに1件積む（idの払い出しをここに閉じ込める） */
function pushEntry(state: GameState, entry: Omit<ChatEntry, "id">): GameState {
  return {
    ...state,
    log: [...state.log, { id: state.nextId, ...entry }],
    nextId: state.nextId + 1,
  };
}

/**
 * 表情由来の加算値を決める。
 * 加算値を呼び出し側に決めさせない（Day3の質問3の +5→+10 を書き忘れないため）。
 */
export function pointsFor(state: GameState, cause: Cause): number {
  switch (cause) {
    case "gaze":
      return isFinalQuestion(state.day, state.turn) ? GAIN.gazeFinal : GAIN.gaze;
    case "expression":
      return GAIN.expression;
    case "smile":
      return GAIN.smile;
    case "answer":
      // 怪しい回答は Groq が返した値を使うので、ここでは決めない
      return 0;
  }
}

/**
 * ゲージを増やす唯一の関数。
 * ターン上限のクリップ、決め手の記録、フラッシュ演出、100到達の判定をまとめて行う。
 */
export function applyGain(
  state: GameState,
  cause: Cause,
  points: number,
): GameState {
  if (state.phase === "clear" || state.phase === "gameover") return state;

  let add = Math.max(0, Math.round(points));

  // 表情由来だけ「1ターンあたり30まで」の上限をかける（AI判定はこの上限の外）
  if (cause !== "answer") {
    const room = Math.max(0, FACE_GAIN_CAP_PER_TURN - state.faceGainThisTurn);
    add = Math.min(add, room);
  }
  if (add === 0) return state;

  const suspicion = Math.min(MAX_SUSPICION, state.suspicion + add);
  const next: GameState = {
    ...state,
    suspicion,
    lastCause: cause,
    flashSeq: state.flashSeq + 1,
    faceGainThisTurn:
      cause === "answer" ? state.faceGainThisTurn : state.faceGainThisTurn + add,
  };

  // 100に達した瞬間に会話を中断し、決め手に応じた最後のセリフを出す
  if (suspicion >= MAX_SUSPICION) {
    return pushEntry(
      { ...next, phase: "gameover", micOn: false, awaitingAI: false },
      { speaker: "secretary", text: GAMEOVER_LINES[cause], kind: "final" },
    );
  }
  return next;
}

/** 次の質問を出し、ターン内の集計をリセットする */
function startTurn(state: GameState, turn: Exclude<Turn, 0>): GameState {
  const question = scenarioOf(state.day).questions[turn - 1];
  return pushEntry(
    {
      ...state,
      turn,
      faceGainThisTurn: 0,
      streakMs: { gaze: 0, expression: 0, smile: 0 },
      gazeEpisodeOpen: false,
      gazeAwayThisTurn: 0,
    },
    { speaker: "secretary", text: question.text, kind: "question" },
  );
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  // 決着後に飛んでくる加算で「決め手」が書き換わらないようにする
  if (state.phase === "gameover" || state.phase === "clear") {
    return action.type === "RESET" ? initialState : state;
  }

  switch (action.type) {
    case "START":
      return state.phase === "title" ? { ...state, phase: "dayStart" } : state;

    case "SLEEP": {
      if (state.phase !== "diary") return state;
      // Day3の日記を読み終えたらクリア
      if (state.day >= 3) return { ...state, phase: "clear" };
      // 疑念ゲージは日をまたいでも引き継ぐ（回復なし）
      return {
        ...state,
        phase: "dayStart",
        day: (state.day + 1) as Day,
        turn: 0,
        log: [],
        nextId: 1,
        micOn: false,
        awaitingAI: false,
        faceGainThisTurn: 0,
        streakMs: { gaze: 0, expression: 0, smile: 0 },
        gazeEpisodeOpen: false,
        gazeAwayThisTurn: 0,
      };
    }

    case "ENTER_OFFICE": {
      if (state.phase !== "dayStart") return state;
      // その日の会話を白紙から始める
      const opened = pushEntry(
        { ...state, phase: "talk", log: [], nextId: 1 },
        { speaker: "secretary", text: scenarioOf(state.day).intro, kind: "intro" },
      );
      return startTurn(opened, 1);
    }

    case "SUBMIT_ANSWER": {
      if (state.phase !== "talk" || state.turn === 0 || state.awaitingAI) return state;
      return pushEntry(
        { ...state, awaitingAI: true, micOn: false },
        {
          speaker: "player",
          text: action.text,
          faceGain: state.faceGainThisTurn,
          gazeAway: state.gazeAwayThisTurn,
        },
      );
    }

    case "AI_REPLY": {
      if (!state.awaitingAI) return state;

      // Groqが壊れた値を返しても0〜30の整数に収める
      const raw = Number(action.suspicion);
      const gain = Number.isFinite(raw)
        ? Math.min(AI_SUSPICION_MAX, Math.max(0, Math.round(raw)))
        : 0;

      // 直前のプレイヤー発言に「疑念 +N」を書き込み、最も疑われた発言を更新する
      const log = [...state.log];
      let worst = state.worstAnswer;
      for (let i = log.length - 1; i >= 0; i--) {
        if (log[i].speaker === "player") {
          log[i] = { ...log[i], gain };
          if (!worst || gain > worst.gain) worst = { text: log[i].text, gain };
          break;
        }
      }

      let next: GameState = { ...state, log, worstAnswer: worst, awaitingAI: false };
      next = pushEntry(next, { speaker: "secretary", text: action.reply, kind: "reply" });
      next = applyGain(next, "answer", gain);

      if (next.phase === "gameover") return next;
      // 3問終わったら日記へ。まだなら次の固定質問を出す
      if (next.turn < 3) return startTurn(next, (next.turn + 1) as Exclude<Turn, 0>);
      return { ...next, phase: "diary", micOn: false };
    }

    case "MIC_ON": {
      if (state.phase !== "talk" || state.turn === 0 || state.awaitingAI) return state;
      // 発話の区切りごとに連続カウントを初期化する（前の発話の残りを持ち込まない）
      return { ...state, micOn: true, streakMs: { gaze: 0, expression: 0, smile: 0 }, gazeEpisodeOpen: false };
    }

    case "MIC_OFF":
      return { ...state, micOn: false, streakMs: { gaze: 0, expression: 0, smile: 0 }, gazeEpisodeOpen: false };

    case "SET_INPUT_MODE":
      return { ...state, inputMode: action.mode };

    case "FRAME": {
      // 発話中以外は無視する（Day開始やシナリオ表示中にゲージが上がらないように）
      if (state.phase !== "talk" || !state.micOn) return state;

      const f = action.frame;
      const t = thresholdsFor(state.day, state.turn);

      // 仕様書「疑念ゲージ」の3条件
      const hit = {
        // 顔が未検出、または顔の中心が中央から大きくずれた
        gaze: !f.found || f.offsetX > t.offsetX || f.offsetY > t.offsetY,
        // fearful / surprised / disgusted のいずれかがしきい値以上
        expression: Math.max(f.fearful, f.surprised, f.disgusted) >= t.uneasy,
        // happy がしきい値以上
        smile: f.happy >= t.tooHappy,
      };

      // 条件を満たしたフレームの経過msを積み、1秒たまるごとに1回加算する
      const streakMs = { ...state.streakMs };
      const fired: Cause[] = [];
      for (const cause of FACE_CAUSES) {
        if (!hit[cause]) {
          streakMs[cause] = 0;
          continue;
        }
        streakMs[cause] += f.dtMs;
        while (streakMs[cause] >= STREAK_MS) {
          streakMs[cause] -= STREAK_MS;
          fired.push(cause);
        }
      }

      // 「目を逸らした回数」は秒数ではなくエピソード数で数える
      // （1回逸らして3秒なら1回）。加算が起きた時点で1エピソード開始とみなす。
      let gazeEpisodeOpen = state.gazeEpisodeOpen;
      let gazeAwayThisTurn = state.gazeAwayThisTurn;
      let gazeAwayCount = state.gazeAwayCount;
      if (!hit.gaze) {
        gazeEpisodeOpen = false;
      } else if (fired.includes("gaze") && !gazeEpisodeOpen) {
        gazeEpisodeOpen = true;
        gazeAwayThisTurn += 1;
        gazeAwayCount += 1;
      }

      let next: GameState = {
        ...state,
        streakMs,
        gazeEpisodeOpen,
        gazeAwayThisTurn,
        gazeAwayCount,
      };
      for (const cause of fired) {
        next = applyGain(next, cause, pointsFor(next, cause));
        if (next.phase === "gameover") break;
      }
      return next;
    }

    case "GAIN":
      return applyGain(state, action.cause, action.points ?? pointsFor(state, action.cause));

    case "RESET":
      return initialState;
  }
}
