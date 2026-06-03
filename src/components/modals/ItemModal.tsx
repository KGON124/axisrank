// Item add/edit modal

import { useState, useEffect } from "react";
import { Modal } from "./Modal";

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description?: string, url?: string, tags?: string[], memo?: string) => void;
  initialName?: string;
  initialDescription?: string;
  initialUrl?: string;
  initialTags?: string[];
  initialMemo?: string;
  mode: "add" | "edit";
}

export function ItemModal({
  isOpen,
  onClose,
  onSubmit,
  initialName = "",
  initialDescription = "",
  initialUrl = "",
  initialTags = [],
  initialMemo = "",
  mode,
}: ItemModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [url, setUrl] = useState(initialUrl);
  const [tagsStr, setTagsStr] = useState(initialTags.join(", "));
  const [memo, setMemo] = useState(initialMemo);

  // Only reset form values when the modal opens (isOpen transitions to true).
  // Do NOT include initialTags in deps — default `[]` creates a new ref each render,
  // which would cause this effect to fire on every keystroke and reset all fields.
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription(initialDescription);
      setUrl(initialUrl);
      setTagsStr(initialTags.join(", "));
      setMemo(initialMemo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    onSubmit(trimmed, description.trim() || undefined, url.trim() || undefined, tags, memo.trim() || undefined);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "要素を追加" : "要素を編集"}
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {mode === "add" ? "追加" : "保存"}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-group__label">要素名</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: GPT-4o"
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-group__label">説明（任意）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="要素の説明..."
        />
      </div>
      <div className="form-group">
        <label className="form-group__label">URL（任意）</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="form-group">
        <label className="form-group__label">タグ（カンマ区切り）</label>
        <input
          type="text"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="例: AI, LLM, OpenAI"
        />
        <span className="form-group__hint">カンマで区切って複数入力</span>
      </div>
      <div className="form-group">
        <label className="form-group__label">メモ（任意）</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="メモ..."
        />
      </div>
    </Modal>
  );
}
