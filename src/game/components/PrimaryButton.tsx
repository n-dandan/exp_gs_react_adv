// src/game/components/PrimaryButton.tsx
// 主ボタン（出仕する／執務室へ／眠る）と副ボタン（もう一度）。design.md 4-1。

export default function PrimaryButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "sub";
}) {
  return (
    <button
      className={variant === "sub" ? "btn btn--sub" : "btn"}
      onClick={onClick}
      disabled={disabled}
      style={{ minWidth: 320 }}
    >
      {children}
    </button>
  );
}
