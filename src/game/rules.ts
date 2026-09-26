// src/game/rules.ts
// 疑念ゲージの調整用の数値をすべてここに集める。
// 仕様書「疑念ゲージ」より：しきい値（0.6 / 0.8 / +5 など）は仮の値。
// 自分の顔で試して「普通にしていれば上がらない、意識して目を逸らすと上がる」になるよう
// このファイルだけを書き換えて調整する（Step7で実施）。

import type { Cause, Day, Turn } from "./types";

/** ゲージの最大値。ここに達した瞬間にゲームオーバー */
export const MAX_SUSPICION = 100;

/** 注意域の境界（40〜69） */
export const CAUTION_AT = 40;
/** 危険域の境界（70〜99）。ゲージバーに縦線を立てる位置でもある */
export const DANGER_AT = 70;

/** 加算値（仕様書の表より） */
export const GAIN: Record<Cause | "gazeFinal", number> = {
  gaze: 5, // 目を逸らした：+5／1秒
  gazeFinal: 10, // Day3の質問3だけ +5→+10（演出上の山場）
  expression: 3, // 不審な表情：+3／1秒
  smile: 2, // 笑いすぎ：+2／1秒
  answer: 0, // 怪しい回答：Groqが返す suspicion をそのまま使うので固定値は持たない
};

/** 表情由来の加算は1ターンあたりこの値まで（表情だけで即死しないようにする） */
export const FACE_GAIN_CAP_PER_TURN = 30;

/** AI判定が返す suspicion の上限（0〜30の整数にクランプする） */
export const AI_SUSPICION_MAX = 30;

/** 「1秒ごとに1回加算」の1秒。フレーム数ではなく実経過msで数える */
export const STREAK_MS = 1000;

/** face-api の推論間隔。200ms＝1秒に5回 */
export const DETECT_INTERVAL_MS = 200;

/**
 * 話し終えてから無音がこの時間続いたら確定して自動送信する。
 * 仕様書は2秒だが、実機で試して話の途中で切れたため調整（2026-09-27：2秒→5秒→3秒）。
 */
export const SILENCE_MS = 3000;

/**
 * マイクを開いてから一言も認識できないまま経過したら、空回答として確定する。
 * 開いた直後から SILENCE_MS で数えると、話し始める前に送信されてしまうため分けている。
 */
export const NO_SPEECH_MS = 8000;

/** 表情・顔向きのしきい値 */
export type FaceThreshold = {
  /** fearful / surprised / disgusted のいずれかがこの値以上なら「不審な表情」 */
  uneasy: number;
  /** happy がこの値以上なら「笑いすぎ」 */
  tooHappy: number;
  /** 顔の中心が中央から横にこの割合以上ずれたら「逸らした」（0〜0.5） */
  offsetX: number;
  /** 同じく縦方向 */
  offsetY: number;
};

/** 通常のしきい値（仕様書「表情・顔向き判定」より 0.6 / 0.8 / 25% / 20%） */
export const FACE_THRESHOLD: FaceThreshold = {
  uneasy: 0.6,
  tooHappy: 0.8,
  offsetX: 0.25,
  offsetY: 0.2,
};

/** Day3の質問3だけ厳しくする（仕様書「Day3」より「しきい値を厳しくする」） */
export const FINAL_FACE_THRESHOLD: FaceThreshold = {
  uneasy: 0.5,
  tooHappy: 0.7,
  offsetX: 0.15,
  offsetY: 0.12,
};

/** その質問が「Day3の最終問題」か（加算値としきい値の切り替えに使う） */
export function isFinalQuestion(day: Day, turn: Turn): boolean {
  return day === 3 && turn === 3;
}

/** 発話中に適用するしきい値を返す */
export function thresholdsFor(day: Day, turn: Turn): FaceThreshold {
  return isFinalQuestion(day, turn) ? FINAL_FACE_THRESHOLD : FACE_THRESHOLD;
}

/** ゲージの状態。Step7で色（金→赤→深紅）を割り当てる */
export type Zone = "safe" | "caution" | "danger";

export function zoneOf(suspicion: number): Zone {
  if (suspicion >= DANGER_AT) return "danger";
  if (suspicion >= CAUTION_AT) return "caution";
  return "safe";
}
