// src/game/useSpeechRecognition.ts
// Web Speech API による音声入力。追加ライブラリなし。Chrome / Edge 前提。
// 仕様書「音声入力（Web Speech API）」より：
//   lang: ja-JP / interimResults: true / continuous: true、無音2秒で確定して自動送信。

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { NO_SPEECH_MS, SILENCE_MS } from "./rules";

/** 波形を動かすための「今声が届いている」判定の猶予 */
const HEARING_MS = 700;

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/** ブラウザ判定は useSyncExternalStore で行う（SSRでは false、ハイドレーション後に確定） */
const subscribeNothing = () => () => {};
const hasApiInBrowser = () => getConstructor() !== null;
const hasApiOnServer = () => false;

export type SpeechRecognitionState = {
  /** このブラウザで使えるか（マウント後に判定。SSRでは false） */
  supported: boolean;
  /** マイクON中 */
  listening: boolean;
  /** 認識中の暫定テキスト（確定分＋未確定分） */
  interim: string;
  /** 直近に音声が届いたか（波形の表示に使う） */
  hearing: boolean;
  /** 使えなくなった理由。マイク拒否やネットワーク断のときに入る */
  error: string | null;
  /** 直近のイベント名（診断表示用） */
  lastEvent: string;
  start: () => void;
  /** 送信せずに中断する（画面が会話から離れたときなど） */
  stop: () => void;
  /** 手動で確定して送信する（送信ボタン） */
  submitNow: () => void;
};

export function useSpeechRecognition({
  onFinal,
  lang = "ja-JP",
  silenceMs = SILENCE_MS,
}: {
  /** 確定した回答テキスト。無音だけだった場合は空文字で呼ばれる */
  onFinal: (text: string) => void;
  lang?: string;
  silenceMs?: number;
}): SpeechRecognitionState {
  const available = useSyncExternalStore(subscribeNothing, hasApiInBrowser, hasApiOnServer);
  /** マイクを拒否された・APIが使えなくなった */
  const [unavailable, setUnavailable] = useState(false);
  const supported = available && !unavailable;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [hearing, setHearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 直近に起きたイベント名。うまく動かないときの切り分け用 */
  const [lastEvent, setLastEvent] = useState("未開始");

  // ゲームのstateを参照するコールバックを渡せるよう、毎レンダーでrefを差し替える
  // （依存配列に入れると認識器が作り直されてしまう）
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  const recRef = useRef<SpeechRecognition | null>(null);
  const finalTextRef = useRef("");
  const interimTextRef = useRef("");
  /** 認識を続けたいか。Chromeが勝手に onend したときの張り直し判定に使う */
  const shouldListenRef = useRef(false);
  /** 二重送信の防止 */
  const committedRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const hearingTimerRef = useRef<number | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  /** 確定して送信する。無音2秒・送信ボタン・no-speechエラーの3経路から呼ばれる */
  const commit = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    shouldListenRef.current = false;
    clearSilenceTimer();

    try {
      recRef.current?.stop();
    } catch {
      // すでに停止していても構わない
    }
    setListening(false);
    setHearing(false);
    setLastEvent("送信");

    const text = (finalTextRef.current + interimTextRef.current).trim();
    finalTextRef.current = "";
    interimTextRef.current = "";
    setInterim("");
    onFinalRef.current(text);
  }, [clearSilenceTimer]);

  /** 無音タイマーを張り替える。話している間は確定しない */
  const armSilenceTimer = useCallback(
    (ms: number) => {
      clearSilenceTimer();
      silenceTimerRef.current = window.setTimeout(commit, ms);
    },
    [clearSilenceTimer, commit],
  );

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    committedRef.current = true; // onend での張り直しを止める
    clearSilenceTimer();
    try {
      recRef.current?.abort();
    } catch {
      // 未開始なら何もしない
    }
    recRef.current = null;
    finalTextRef.current = "";
    interimTextRef.current = "";
    setInterim("");
    setListening(false);
    setHearing(false);
    setLastEvent("停止");
  }, [clearSilenceTimer]);

  const start = useCallback(() => {
    const Ctor = getConstructor();
    if (!Ctor) {
      setUnavailable(true);
      return;
    }

    // 前の認識器が残っていたら片付ける。
    // ハンドラを外してから abort しないと、古い認識器の onend が
    // 「まだ続けたい」と判断して自分を再起動し、認識器が二重に走る。
    const previous = recRef.current;
    if (previous) {
      previous.onresult = null;
      previous.onend = null;
      previous.onerror = null;
      try {
        previous.abort();
      } catch {
        // 未開始なら何もしない
      }
    }
    recRef.current = null;

    committedRef.current = false;
    shouldListenRef.current = true;
    finalTextRef.current = "";
    interimTextRef.current = "";
    setInterim("");
    setError(null);

    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalChunk += result[0].transcript;
        else interimChunk += result[0].transcript;
      }
      if (finalChunk) finalTextRef.current += finalChunk;
      interimTextRef.current = interimChunk;
      setInterim(finalTextRef.current + interimChunk);

      // 声が届いたので波形を動かし、無音タイマーを延長する
      setHearing(true);
      if (hearingTimerRef.current !== null) window.clearTimeout(hearingTimerRef.current);
      hearingTimerRef.current = window.setTimeout(() => setHearing(false), HEARING_MS);
      // 声が届いてから「無音2秒」を数え始める
      armSilenceTimer(silenceMs);
      setLastEvent(interimChunk ? "認識中" : "確定");
    };

    rec.onstart = () => setLastEvent("マイク接続");
    rec.onspeechstart = () => setLastEvent("発話検知");

    rec.onerror = (event) => {
      setLastEvent(`エラー: ${event.error}`);
      switch (event.error) {
        case "no-speech":
          // 一言も拾えなかった → 空文字で確定（書記長が「……何も言わないのか？」と返す）
          commit();
          break;
        case "aborted":
          // stop() による意図的な中断。何もしない
          break;
        case "not-allowed":
        case "service-not-allowed":
          setError("マイクが許可されていません");
          setUnavailable(true);
          shouldListenRef.current = false;
          setListening(false);
          break;
        default:
          // network など。テキスト入力に切り替えられるよう理由を出す
          setError(`音声認識が使えません（${event.error}）`);
          shouldListenRef.current = false;
          setListening(false);
      }
    };

    rec.onend = () => {
      // continuous:true でも Chrome は無音で勝手に終了するので、送信前なら張り直す
      if (shouldListenRef.current && !committedRef.current) {
        try {
          rec.start();
          setLastEvent("再開");
          return;
        } catch {
          // 張り直せなければ諦めて停止扱いにする
        }
      }
      setListening(false);
    };

    try {
      rec.start();
    } catch {
      // すでに開始済みの例外は無視してよい
    }
    recRef.current = rec;
    setListening(true);
    setLastEvent("開始");
    // 一言も話さないまま黙っているケースの保険。
    // ここで SILENCE_MS を使うと、話し始める前に確定してしまう。
    armSilenceTimer(NO_SPEECH_MS);
  }, [armSilenceTimer, commit, lang, silenceMs]);

  // 画面から離れるときにマイクを必ず止める
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      committedRef.current = true;
      if (silenceTimerRef.current !== null) window.clearTimeout(silenceTimerRef.current);
      if (hearingTimerRef.current !== null) window.clearTimeout(hearingTimerRef.current);
      try {
        recRef.current?.abort();
      } catch {
        // 未開始なら何もしない
      }
    };
  }, []);

  return { supported, listening, interim, hearing, error, lastEvent, start, stop, submitNow: commit };
}
