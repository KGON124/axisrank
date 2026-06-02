// Header component

import { useState } from "react";
import { createPortal } from "react-dom";
import { useAppState, useCurrentProject } from "../state/hooks";
import { AxisSettingsModal } from "./modals/AxisSettingsModal";
import { ScoreSettingsModal } from "./modals/ScoreSettingsModal";
import type { AxisConfig, ScoreConfig } from "../core/types";

export function Header() {
  const { state, dispatch } = useAppState();
  const project = useCurrentProject();
  const [showAxisSettings, setShowAxisSettings] = useState(false);
  const [showScoreSettings, setShowScoreSettings] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const handleNameDoubleClick = () => {
    if (!project) return;
    setNameValue(project.name);
    setEditingName(true);
  };

  const handleNameSubmit = () => {
    if (!project || !nameValue.trim()) {
      setEditingName(false);
      return;
    }
    dispatch({
      type: "UPDATE_PROJECT",
      projectId: project.id,
      name: nameValue.trim(),
      description: project.description,
    });
    setEditingName(false);
  };

  const handleAxesSubmit = (axes: AxisConfig) => {
    if (!project) return;
    dispatch({
      type: "UPDATE_AXES",
      projectId: project.id,
      axes,
    });
  };

  const handleScoreSubmit = (scoreConfig: ScoreConfig) => {
    if (!project) return;
    dispatch({
      type: "UPDATE_SCORE_CONFIG",
      payload: {
        projectId: project.id,
        scoreConfig,
      }
    });
  };

  return (
    <header className="header">
      <div className="header__left">
        <span className="header__logo">AxisRank</span>
        {project && (
          <>
            <span style={{ color: "var(--text-muted)" }}>／</span>
            {editingName ? (
              <input
                className="header__project-name"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNameSubmit();
                  if (e.key === "Escape") setEditingName(false);
                }}
                autoFocus
              />
            ) : (
              <span
                className="header__project-name"
                onDoubleClick={handleNameDoubleClick}
                title="ダブルクリックで編集"
              >
                {project.name}
              </span>
            )}
          </>
        )}
      </div>
      <div className="header__right">
        {project && (
          <>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setShowScoreSettings(true)}
            >
              [-] 配点設定
            </button>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setShowAxisSettings(true)}
            >
              ⚙ 軸設定
            </button>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => dispatch({
                type: "SET_THEME",
                theme: state.theme === "dark" ? "light" : "dark"
              })}
              title="テーマ切り替え"
              style={{ width: "32px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5" fill="var(--text-primary)" />
              </svg>
            </button>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              {project.items.length} 要素
            </div>
          </>
        )}
      </div>
      {project && createPortal(
        <AxisSettingsModal
          isOpen={showAxisSettings}
          onClose={() => setShowAxisSettings(false)}
          onSubmit={handleAxesSubmit}
          initialAxes={project.axes}
        />,
        document.body
      )}
      {project && project.scoreConfig && createPortal(
        <ScoreSettingsModal
          isOpen={showScoreSettings}
          onClose={() => setShowScoreSettings(false)}
          onSubmit={handleScoreSubmit}
          initialConfig={project.scoreConfig}
        />,
        document.body
      )}
    </header>
  );
}
