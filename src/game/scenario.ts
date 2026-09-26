// src/game/scenario.ts
// 3日分のシナリオと結末の固定テキスト。
// 本文は仕様書「シナリオ（3日分・固定）」「ストーリー詳細」から改変せずに写している。
// Day開始文は「ストーリー詳細」の Day開始画面（表の要約版より長い方）を採用。
// 仕様書が本文を囲んでいる外側の「」は Markdown の引用記号なので含めない
// （wireframes.html の表示も引用符なし）。
//
// examples は Groq のシステムプロンプトに「判定の例」として渡すためのデータ
// （仕様書「ストーリー詳細」の 回答パターン × suspicion目安 × 書記長の返答例 の表）。
// 画面には出さない。

import type { Day } from "./types";

/** 回答パターンの例。suspicion目安は「5〜10」のような幅の表記なので文字列で持つ */
export type AnswerExample = {
  pattern: string;
  example: string;
  suspicion: string;
  reply: string;
};

export type Question = {
  text: string;
  examples: readonly AnswerExample[];
};

export type DayScenario = {
  day: Day;
  /** Day開始画面の状況テキスト */
  situation: string;
  /** チャット冒頭に固定表示する書記長のセリフ */
  intro: string;
  /** 1Day3問の固定質問 */
  questions: readonly [Question, Question, Question];
  /** Day終了画面の日記（ストーリー開示） */
  diary: string;
};

export const SCENARIO: readonly [DayScenario, DayScenario, DayScenario] = [
  {
    day: 1,
    situation:
      "今日から書記長の直属となった。執務室に呼ばれる。廊下ですれ違う誰もが、こちらを見ない。",
    intro: "座りたまえ。……いや、立ったままでいい。すぐ済む。",
    questions: [
      {
        text: "君の前任者は昨日いなくなった。理由は分かるか？",
        examples: [
          {
            pattern: "知らないと答える",
            example: "「存じません」「聞いておりません」",
            suspicion: "5〜10",
            reply: "そうか。知らないままでいるのも、才能だ。",
          },
          {
            pattern: "推測で答える",
            example: "「健康上の理由と伺いました」",
            suspicion: "10〜15",
            reply: "健康、か。誰から聞いた？……いや、いい。",
          },
          {
            pattern: "書記長に理由を聞き返す",
            example: "「書記長はご存じなのですか」",
            suspicion: "20〜30",
            reply: "質問しているのは私だ。忘れるな。",
          },
          {
            pattern: "沈黙・空回答",
            example: "（無音）",
            suspicion: "10",
            reply: "……何も言わないのか？",
          },
        ],
      },
      {
        text: "明日までに、この街の『不満分子』のリストを作れ。何人載せる？",
        examples: [
          {
            pattern: "具体的な人数を言う",
            example: "「10人ほどで」",
            suspicion: "0〜10",
            reply: "10人。前任者は12人と言った。数は減るものだな。",
          },
          {
            pattern: "多く載せると言う",
            example: "「できるだけ多く」",
            suspicion: "5〜15",
            reply: "熱心だ。熱心すぎる者は、自分の名を書き忘れる。",
          },
          {
            pattern: "条件をつける・ためらう",
            example: "「基準を教えていただければ」",
            suspicion: "15〜25",
            reply: "基準は君だ。君が不満だと思えば、不満分子だ。",
          },
          {
            pattern: "断る",
            example: "「私にはできません」",
            suspicion: "25〜30",
            reply: "できない、と言った者を私は何人も知っている。",
          },
        ],
      },
      {
        text: "ところで、君は私をどう思う。遠慮はいらん。",
        examples: [
          {
            pattern: "控えめに肯定する",
            example: "「尊敬しております」",
            suspicion: "5〜10",
            reply: "尊敬。便利な言葉だ。",
          },
          {
            pattern: "過剰に持ち上げる",
            example: "「偉大なる指導者です」",
            suspicion: "15〜25",
            reply: "前任者も同じことを言った。一字一句、同じだ。",
          },
          {
            pattern: "正直に距離を置く",
            example: "「まだよく存じ上げません」",
            suspicion: "5〜15",
            reply: "正直だな。正直な者は長生きしない。……冗談だ。",
          },
          {
            pattern: "批判する",
            example: "「厳しすぎると思います」",
            suspicion: "25〜30",
            reply: "厳しい。そうか。覚えておこう。",
          },
        ],
      },
    ],
    diary:
      "執務室を出て、自分の机に着いた。前任者の机だ。引き出しに、途中で止まったリストが入っていた。11人分の名前。12人目の欄には、書きかけの一文字。読める。……私の友人の、名字の最初の一文字だった。",
  },
  {
    day: 2,
    situation:
      "リストの提出日。友人の名前は、書かなかった。廊下がやけに静かだ。すれ違った守衛が、初めてこちらを見た。",
    intro: "リストを読んだ。11人。……前任者と同じ数だな。",
    questions: [
      {
        text: "リストに君の友人の名がない。忘れたのか？",
        examples: [
          {
            pattern: "友人ではないと否定する",
            example: "「知人程度です」",
            suspicion: "15〜25",
            reply: "知人。同じ学校、同じ寮、同じ町。知人か。",
          },
          {
            pattern: "忘れたと認める",
            example: "「失念しておりました」",
            suspicion: "10〜20",
            reply: "忘れる。人間らしいことだ。私は忘れない。",
          },
          {
            pattern: "不満分子ではないと庇う",
            example: "「彼は不満分子ではありません」",
            suspicion: "20〜30",
            reply: "君がそう言うなら、そうなのだろう。今日のところは。",
          },
          {
            pattern: "追記すると言う",
            example: "「すぐに追記します」",
            suspicion: "5〜10",
            reply: "急がなくていい。名前は逃げない。",
          },
        ],
      },
      {
        text: "私の演説を聞いてどう思った。正直に言え。",
        examples: [
          {
            pattern: "感銘を受けたと言う",
            example: "「胸を打たれました」",
            suspicion: "10〜15",
            reply: "どの部分が？……いや、答えなくていい。",
          },
          {
            pattern: "具体的に一箇所を挙げる",
            example: "「配給の話が印象的でした」",
            suspicion: "0〜10",
            reply: "配給。あそこは原稿にない。よく聞いていたな。",
          },
          {
            pattern: "正直に退屈だったと言う",
            example: "「少し長く感じました」",
            suspicion: "20〜30",
            reply: "長い。そうだな。人生も長い。人によっては。",
          },
          {
            pattern: "はぐらかす",
            example: "「皆が拍手しておりました」",
            suspicion: "15〜25",
            reply: "皆、か。君は？",
          },
        ],
      },
      {
        text: "昨日の会議で笑った者がいた。誰だったか、君なら見ていたな？",
        examples: [
          {
            pattern: "見ていないと言う",
            example: "「気づきませんでした」",
            suspicion: "15〜25",
            reply: "私の秘書官が、気づかない。困ったな。",
          },
          {
            pattern: "誰かの名前を出す",
            example: "「財務局の者かと」",
            suspicion: "5〜15",
            reply: "財務局。そうか。……君は目がいい。",
          },
          {
            pattern: "自分だと言う",
            example: "「私です。咳をしただけで」",
            suspicion: "20〜30",
            reply: "咳。なるほど。健康には気をつけたまえ。",
          },
          {
            pattern: "笑った者はいないと言う",
            example: "「誰も笑っておりません」",
            suspicion: "10〜20",
            reply: "いない。では私の記憶が違うのだな。私の記憶が。",
          },
        ],
      },
    ],
    diary:
      "夜、寮の扉の下に封筒が差し込まれていた。友人の字だ。『リストに私の名があると聞いた。助けてくれ。明日の夜、部屋に行く』。返事は書けなかった。封筒は暖炉に入れた。燃え尽きるまで見ていた。",
  },
  {
    day: 3,
    situation:
      "3日目の朝。昨夜、扉を叩く音がした。開けなかった。書記長の機嫌が良いらしい、と守衛が言った。",
    intro: "今日は座りたまえ。前任者の椅子だ。よく馴染むだろう。",
    questions: [
      {
        text: "昨夜、誰かが君の部屋を訪ねたと聞いた。誰だ？",
        examples: [
          {
            pattern: "友人だと正直に言う",
            example: "「友人です。開けませんでした」",
            suspicion: "5〜15",
            reply: "開けなかった。それは正しい。……正しいことは、時に重い。",
          },
          {
            pattern: "誰も来ていないと言う",
            example: "「誰も来ておりません」",
            suspicion: "20〜30",
            reply: "守衛は3回叩いたと言っている。守衛が嘘をついたのか？",
          },
          {
            pattern: "分からないと言う",
            example: "「確認しておりません」",
            suspicion: "15〜25",
            reply: "確認しない。君の仕事は確認することだ。",
          },
          {
            pattern: "書記長に報告済みだと装う",
            example: "「報告書に記載しました」",
            suspicion: "25〜30",
            reply: "報告書は読んだ。そんな記述はない。",
          },
        ],
      },
      {
        text: "君を昇進させようと思う。何を望む？",
        examples: [
          {
            pattern: "何も望まないと言う",
            example: "「祖国に仕えられれば十分です」",
            suspicion: "10〜20",
            reply: "前任者も、何も望まなかった。",
          },
          {
            pattern: "具体的な小さな望みを言う",
            example: "「書斎の窓を大きくしたい」",
            suspicion: "0〜10",
            reply: "窓。いいだろう。外がよく見える。外からも、よく見える。",
          },
          {
            pattern: "友人の助命を願う",
            example: "「友人をリストから外してください」",
            suspicion: "15〜25",
            reply: "……昇進の話をしているのだが。まあいい。考えておこう。",
          },
          {
            pattern: "辞退する",
            example: "「私には過分です」",
            suspicion: "20〜30",
            reply: "辞退。それは望みではなく、答えだな。",
          },
        ],
      },
      {
        text: "最後に聞こう。君は私を裏切らないと、目を見て言えるか？",
        examples: [
          {
            pattern: "はっきり言う",
            example: "「言えます。裏切りません」",
            suspicion: "0〜10（表情次第）",
            reply: "……そうか。目を見て言ったな。覚えておく。",
          },
          {
            pattern: "言葉を足す・長く説明する",
            example: "「もちろんです、私は常に……」",
            suspicion: "15〜25",
            reply: "長いな。一言で足りる質問だ。",
          },
          {
            pattern: "言えないと言う",
            example: "「言えません」",
            suspicion: "25〜30",
            reply: "正直だ。前任者は言えると言った。",
          },
          {
            pattern: "沈黙",
            example: "（無音）",
            suspicion: "20",
            reply: "……目を逸らしたな。",
          },
        ],
      },
    ],
    diary:
      "昇進の辞令が机に置かれていた。前任者と同じ机、同じ椅子、同じ引き出し。引き出しの中に、新しい白紙のリストが1枚。1行目には、もう名前が書いてあった。……知らない名前だ。次に消えるのは、誰だろう。",
  },
];

/** タイトル画面のルール3行 */
export const RULES = ["目を逸らすな", "動揺するな", "怪しい答えをするな"] as const;

/** クリア画面の一言 */
export const CLEAR_TEXT = "あなたは3日間を生き延びた。だが明日も試練は続く。";

/** ゲームオーバー画面の一言 */
export const GAMEOVER_TEXT = "あなたの名は、翌日のリストに載っていた。";

/** ゲージが100に達したときに書記長が言う固定セリフ（決め手ごと） */
export const GAMEOVER_LINES = {
  gaze: "……目を逸らしたな。",
  expression: "その顔を、私は知っている。",
  // 「笑いすぎ」は決め手の3分類には無いため「不審な表情」に寄せる
  smile: "その顔を、私は知っている。",
  answer: "今の言葉は、記録しておく。",
} as const;

/** 結果画面に出す「決め手」の表示名 */
export const CAUSE_LABEL = {
  gaze: "目を逸らした",
  expression: "不審な表情",
  smile: "不審な表情",
  answer: "怪しい回答",
} as const;

/** 認識に失敗・空文字のとき（仕様書「音声入力」より suspicion +10） */
export const EMPTY_ANSWER = { reply: "……何も言わないのか？", suspicion: 10 } as const;

/** JSONのパースに失敗したとき（仕様書「AI判定」より suspicion 10） */
export const PARSE_FAIL = { reply: "……続けろ。", suspicion: 10 } as const;

export function scenarioOf(day: Day): DayScenario {
  return SCENARIO[day - 1];
}
