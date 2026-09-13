// src/app/history/DeleteButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ id }: { id: number }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("この記録を削除します。よろしいですか？")) return;

    setDeleting(true);   // ★ 連打防止。fetch より前に置く
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");

        // 画面から消すために必要。サーバ側に更新をしてもらい最新のHTMLを送ってもらう。
        router.refresh();
    } catch (e) {
      console.error(e);
      alert("削除に失敗しました。時間をおいて試してください。");
      setDeleting(false);   // 失敗したときだけ戻す
    }
  }

  return (
    <button onClick={handleDelete} disabled={deleting} style={{ marginLeft: 8 }}>
      {deleting ? "削除中…" : "🗑 削除"}
    </button>
  );
}
