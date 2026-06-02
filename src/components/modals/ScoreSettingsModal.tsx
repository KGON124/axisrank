import { useState, useEffect } from "react";
import type { ScoreConfig, ScoreMappingMode, ScoreRoundingMode } from "../../core/types";

interface ScoreSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: ScoreConfig) => void;
  initialConfig: ScoreConfig;
}

export function ScoreSettingsModal({
  isOpen,
  onClose,
  onSubmit,
  initialConfig,
}: ScoreSettingsModalProps) {
  const [config, setConfig] = useState<ScoreConfig>(initialConfig);

  useEffect(() => {
    if (isOpen) {
      setConfig(initialConfig);
    }
  }, [isOpen, initialConfig]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.minScore >= config.maxScore) {
      alert("最小点は最大点より小さくする必要があります");
      return;
    }
    onSubmit(config);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">配点変換設定</h2>
          <button className="btn btn--ghost btn--icon btn--sm" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal__body">
          <div className="form-group" style={{ flexDirection: "row", alignItems: "center" }}>
            <input
              type="checkbox"
              id="enabled"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              style={{ marginRight: 8 }}
            />
            <label htmlFor="enabled" style={{ margin: 0 }}>配点機能を有効にする</label>
          </div>

          <div className="score-settings-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
            <div className="form-group">
              <label>最小点 (minScore)</label>
              <input
                type="number"
                step="0.1"
                value={config.minScore}
                onChange={(e) => setConfig({ ...config, minScore: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>最大点 (maxScore)</label>
              <input
                type="number"
                step="0.1"
                value={config.maxScore}
                onChange={(e) => setConfig({ ...config, maxScore: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>合格点 (passScore)</label>
              <input
                type="number"
                step="0.1"
                value={config.passScore}
                onChange={(e) => setConfig({ ...config, passScore: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>境界幅 (borderlineMargin)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={config.borderlineMargin}
                onChange={(e) => setConfig({ ...config, borderlineMargin: Number(e.target.value) })}
                className="input"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "16px" }}>
            <label>配点方式 (Mode)</label>
            <select
              value={config.mode}
              onChange={(e) => setConfig({ ...config, mode: e.target.value as ScoreMappingMode })}
              className="input"
            >
              <option value="linear">Linear (相対評価値をそのまま変換)</option>
              <option value="compressed">Compressed (極端な点数を抑える)</option>
              <option value="pass_anchored">Pass Anchored (中央を合格点に合わせる)</option>
            </select>
          </div>

          {(config.mode === "compressed" || config.mode === "pass_anchored") && (
            <div className="form-group">
              <label>圧縮率 (Compression: 0.0〜1.0)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={config.compression}
                onChange={(e) => setConfig({ ...config, compression: Number(e.target.value) })}
                className="input"
              />
              <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: 4 }}>
                1.0=圧縮なし, 0.8=少し中心に寄せる, 0.0=全て中心に潰す
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginTop: "16px" }}>
            <label>丸め方式 (Rounding)</label>
            <select
              value={config.roundingMode}
              onChange={(e) => setConfig({ ...config, roundingMode: e.target.value as ScoreRoundingMode })}
              className="input"
            >
              <option value="continuous">Continuous (小数のまま)</option>
              <option value="integer">Integer (整数に丸める)</option>
              <option value="step">Step (段階数に合わせて丸める)</option>
            </select>
          </div>

          {config.roundingMode === "step" && (
            <div className="form-group">
              <label>段階数 (Steps)</label>
              <input
                type="number"
                step="1"
                min="2"
                value={config.steps}
                onChange={(e) => setConfig({ ...config, steps: Number(e.target.value) })}
                className="input"
              />
            </div>
          )}

          <div className="modal__actions" style={{ marginTop: "24px" }}>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn btn--primary">
              設定を保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
