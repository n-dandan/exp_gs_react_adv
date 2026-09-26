// src/game/components/ScreenFrame.tsx
// タイトル・Day開始・日記・結果で共通の外枠。
// 1280×800想定だが、ブラウザのクロームを引くと800pxに届かないので高さは 100dvh。

export default function ScreenFrame({
  children,
  variant,
}: {
  children: React.ReactNode;
  /** rays: 放射する光線（タイトル）／raysGold: 金の光線（クリア）／purge: 反転（ゲームオーバー） */
  variant?: "rays" | "raysGold" | "purge";
}) {
  const modifier =
    variant === "rays"
      ? " screen--rays"
      : variant === "raysGold"
        ? " screen--rays screen--rays-gold"
        : variant === "purge"
          ? " screen--purge"
          : "";

  return <main className={`screen noise${modifier}`}>{children}</main>;
}
