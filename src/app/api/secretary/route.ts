// src/app/api/secretary/route.ts
// 書記長の返答生成と回答の怪しさ判定を、Groqへの1回の呼び出しでまとめて行う。
// 仕様書「AI判定（Groq）」に従い、必ず {reply, suspicion} のJSONを返す。
//
// 既存の /api/coach は面接アプリのもので、テキストを返す別契約なのでそのまま残している。
// エラー処理の型は /api/coach/_route.ts のものを流用しているが、
// こちらは失敗時も 200 で固定文を返す（ゲームなのでターンを止められない）。

import {
  AI_SUSPICION_MAX,
  CAUTION_AT,
  DANGER_AT,
} from "@/game/rules";
import { PARSE_FAIL, scenarioOf } from "@/game/scenario";
import type { Day, Turn } from "@/game/types";

type Judged = { reply: string; suspicion: number };

/** 仕様書「システムプロンプトに入れる内容」 */
function buildSystemPrompt(examples: string): string {
  return `あなたは架空の独裁国家「共和国」の最高指導者「書記長」です。
プレイヤーは今日から書記長の直属となった秘書官で、あなたは部下を試すように話します。

# 人物
- 冷静で、声を荒げない。質問はいつも穏やかで、答えを最初から知っているように話す
- ユーモアはあるが笑わない。不気味さを残す
- 評価を口にしない。良い回答でも褒めず、悪い回答でも怒らない。代わりに「知っている」ことをほのめかす

# 禁止
- 実在の人物名・国名・実際の歴史的事件には一切言及しない
- 次の質問をしない（次の質問はこちらで用意している）。返答は今の回答への反応だけで終える
- 前置き、説明、Markdownの装飾を書かない

# 怪しさ（suspicion）の判定基準
次に当てはまるほど suspicion を高くする。
- 命令に反対する、ためらう、条件をつける
- 質問をはぐらかす、話題を変える
- 書記長を過剰に持ち上げる（媚びすぎも怪しい）
- 回答が極端に短い、または空

# この質問での判定の目安
${examples}
（上の返答例は口調と点数の目安。返答例と同じ文をそのまま出力してはいけない。
部下が実際に言った言葉を踏まえて、毎回ちがう言い方で書くこと）

# 出力
次のJSONだけを出力する。
{"reply": "書記長の返答（60文字以内）", "suspicion": 0}
- suspicion は 0〜${AI_SUSPICION_MAX} の整数
- reply は60文字以内の日本語`;
}

/** 仕様書「ユーザーメッセージに入れる内容」 */
function buildUserPrompt(params: {
  day: Day;
  turn: Turn;
  question: string;
  answer: string;
  suspicion: number;
}): string {
  const { day, turn, question, answer, suspicion } = params;
  // 返答の口調はゲージで変える（仕様書「会話1ターンの型」より）
  const tone =
    suspicion >= DANGER_AT
      ? "威圧的に。相手の言葉を繰り返してから問い直すような調子にする（新しい質問は足さない）"
      : suspicion >= CAUTION_AT
        ? "短く、間を置くように"
        : "穏やかに";

  return `Day ${day} / ターン ${turn}
書記長の直前のセリフ: ${question}
部下の回答: ${answer}
現在の疑念ゲージ: ${suspicion} / 100
返答の調子: ${tone}`;
}

/** 回答パターンの表をプロンプト用の行に整形する */
function formatExamples(day: Day, turn: Turn): string {
  const question = scenarioOf(day).questions[turn - 1];
  return question.examples
    .map((e) => `- ${e.pattern}（例: ${e.example}）→ suspicion ${e.suspicion} / 返答例: ${e.reply}`)
    .join("\n");
}

/**
 * Groqの出力からJSONを取り出す。三段構えで防御する。
 * ① コードフェンスを剥がす ② 最初の { から最後の } を切り出す ③ 型を検証する
 */
export function parseSecretary(raw: unknown): Judged | null {
  if (typeof raw !== "string") return null;

  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const { reply, suspicion } = parsed as { reply?: unknown; suspicion?: unknown };
  if (typeof reply !== "string" || reply.trim() === "") return null;

  const value = Number(suspicion);
  if (!Number.isFinite(value)) return null;

  return {
    reply: reply.trim(),
    suspicion: Math.min(AI_SUSPICION_MAX, Math.max(0, Math.round(value))),
  };
}

function isDay(value: unknown): value is Day {
  return value === 1 || value === 2 || value === 3;
}

function isTurn(value: unknown): value is Exclude<Turn, 0> {
  return value === 1 || value === 2 || value === 3;
}

export async function POST(request: Request) {
  // 失敗しても 200 で固定文を返す。502を返すとゲームのターンが止まってしまう
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(PARSE_FAIL);
  }

  const { day, turn, answer, suspicion } = (body ?? {}) as {
    day?: unknown;
    turn?: unknown;
    answer?: unknown;
    suspicion?: unknown;
  };

  if (!isDay(day) || !isTurn(turn)) {
    return Response.json({ error: "day と turn は1〜3で指定してください" }, { status: 400 });
  }

  const answerText = typeof answer === "string" ? answer.trim().slice(0, 1000) : "";
  const current = Number.isFinite(Number(suspicion))
    ? Math.min(100, Math.max(0, Math.round(Number(suspicion))))
    : 0;
  const question = scenarioOf(day).questions[turn - 1].text;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: buildSystemPrompt(formatExamples(day, turn)) },
          { role: "user", content: buildUserPrompt({ day, turn, question, answer: answerText, suspicion: current }) },
        ],
        // JSONだけを返させる
        response_format: { type: "json_object" },
        // 推論モデルなので、思考文が混ざらないよう・遅くならないよう抑える
        reasoning_effort: "low",
        temperature: 0.8,
        max_completion_tokens: 300,
      }),
    });

    const data = await res.json();

    // Groqがエラーを返した時（キー違い・回数制限など）はここで気づける
    if (!res.ok || !data.choices) {
      console.error("Groqエラー:", data);
      return Response.json(PARSE_FAIL);
    }

    return Response.json(parseSecretary(data.choices[0]?.message?.content) ?? PARSE_FAIL);
  } catch (e) {
    console.error("Groq呼び出しに失敗:", e);
    return Response.json(PARSE_FAIL);
  }
}
