// Project create/edit modal

import { useState, useEffect } from "react";
import { Modal } from "./Modal";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description?: string) => void;
  initialName?: string;
  initialDescription?: string;
  mode: "create" | "edit";
}

export function ProjectModal({
  isOpen,
  onClose,
  onSubmit,
  initialName = "",
  initialDescription = "",
  mode,
}: ProjectModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription(initialDescription);
    }
  }, [isOpen, initialName, initialDescription]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, description.trim() || undefined);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "新規プロジェクト" : "プロジェクト編集"}
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
            {mode === "create" ? "作成" : "保存"}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-group__label">プロジェクト名</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: AIモデル比較"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>
      <div className="form-group">
        <label className="form-group__label">説明（任意）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="プロジェクトの説明..."
        />
      </div>
    </Modal>
  );
}
