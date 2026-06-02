// Axis settings modal

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import type { AxisConfig, AxisDirection } from "../../core/types";

interface AxisSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (axes: AxisConfig) => void;
  initialAxes: AxisConfig;
}

export function AxisSettingsModal({
  isOpen,
  onClose,
  onSubmit,
  initialAxes,
}: AxisSettingsModalProps) {
  const [axes, setAxes] = useState<AxisConfig>(initialAxes);

  useEffect(() => {
    if (isOpen) setAxes(initialAxes);
  }, [isOpen, initialAxes]);

  const updateXAxis = (field: string, value: string | number) => {
    setAxes((prev) => ({
      ...prev,
      x: { ...prev.x, [field]: value },
    }));
  };

  const updateYAxis = (field: string, value: string | number) => {
    setAxes((prev) => ({
      ...prev,
      y: { ...prev.y, [field]: value },
    }));
  };

  const handleSubmit = () => {
    onSubmit(axes);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="軸設定"
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn btn--primary" onClick={handleSubmit}>
            適用
          </button>
        </>
      }
    >
      {/* X Axis */}
      <div className="axis-config">
        <div className="axis-config__title">
          <span>↔</span> X軸
        </div>
        <div className="form-group">
          <label className="form-group__label">軸名</label>
          <input
            type="text"
            value={axes.x.name}
            onChange={(e) => updateXAxis("name", e.target.value)}
            placeholder="例: 実装容易性"
          />
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label className="form-group__label">左端ラベル</label>
            <input
              type="text"
              value={axes.x.minLabel}
              onChange={(e) => updateXAxis("minLabel", e.target.value)}
              placeholder="低い"
            />
          </div>
          <div className="form-group">
            <label className="form-group__label">右端ラベル</label>
            <input
              type="text"
              value={axes.x.maxLabel}
              onChange={(e) => updateXAxis("maxLabel", e.target.value)}
              placeholder="高い"
            />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label className="form-group__label">方向</label>
            <select
              value={axes.x.direction}
              onChange={(e) =>
                updateXAxis("direction", e.target.value as AxisDirection)
              }
            >
              <option value="higher_is_better">右が高評価</option>
              <option value="lower_is_better">左が高評価</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-group__label">重み</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={axes.x.weight}
              onChange={(e) =>
                updateXAxis("weight", parseFloat(e.target.value) || 0)
              }
            />
          </div>
        </div>
      </div>

      {/* Y Axis */}
      <div className="axis-config">
        <div className="axis-config__title">
          <span>↕</span> Y軸
        </div>
        <div className="form-group">
          <label className="form-group__label">軸名</label>
          <input
            type="text"
            value={axes.y.name}
            onChange={(e) => updateYAxis("name", e.target.value)}
            placeholder="例: 将来性"
          />
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label className="form-group__label">下端ラベル</label>
            <input
              type="text"
              value={axes.y.minLabel}
              onChange={(e) => updateYAxis("minLabel", e.target.value)}
              placeholder="低い"
            />
          </div>
          <div className="form-group">
            <label className="form-group__label">上端ラベル</label>
            <input
              type="text"
              value={axes.y.maxLabel}
              onChange={(e) => updateYAxis("maxLabel", e.target.value)}
              placeholder="高い"
            />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label className="form-group__label">方向</label>
            <select
              value={axes.y.direction}
              onChange={(e) =>
                updateYAxis("direction", e.target.value as AxisDirection)
              }
            >
              <option value="higher_is_better">上が高評価</option>
              <option value="lower_is_better">下が高評価</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-group__label">重み</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={axes.y.weight}
              onChange={(e) =>
                updateYAxis("weight", parseFloat(e.target.value) || 0)
              }
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
