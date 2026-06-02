// Left Sidebar - Project list

import { useState } from "react";
import { useAppState } from "../state/hooks";
import { ProjectModal } from "./modals/ProjectModal";
import { ConfirmDialog } from "./modals/ConfirmDialog";

export function LeftSidebar() {
  const { state, dispatch } = useAppState();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleCreateProject = (name: string, description?: string) => {
    dispatch({ type: "CREATE_PROJECT", name, description });
  };

  const handleDeleteProject = () => {
    if (deleteTarget) {
      dispatch({ type: "DELETE_PROJECT", projectId: deleteTarget });
      setDeleteTarget(null);
    }
  };

  const deleteProjectName = deleteTarget
    ? state.projects.find((p) => p.id === deleteTarget)?.name ?? ""
    : "";

  return (
    <aside className="left-sidebar">
      <div className="left-sidebar__header">
        <span className="left-sidebar__title">プロジェクト</span>
        <button
          className="btn btn--icon btn--ghost"
          onClick={() => setShowCreateModal(true)}
          title="新規プロジェクト"
        >
          ＋
        </button>
      </div>

      <div className="left-sidebar__list">
        {state.projects.length === 0 ? (
          <div className="empty-state" style={{ padding: "var(--space-8) var(--space-4)" }}>
            <div className="empty-state__icon">📂</div>
            <div className="empty-state__title">プロジェクトなし</div>
            <div className="empty-state__description">
              「＋」ボタンから新しいプロジェクトを作成してください
            </div>
          </div>
        ) : (
          state.projects.map((project) => {
            const isActive = project.id === state.currentProjectId;
            const placedCount = project.items.filter(
              (i) => i.x !== null && i.y !== null
            ).length;
            return (
              <div
                key={project.id}
                className={`project-card ${isActive ? "project-card--active" : ""}`}
                onClick={() =>
                  dispatch({ type: "SET_CURRENT_PROJECT", projectId: project.id })
                }
              >
                <div className="project-card__icon">
                  {project.name.charAt(0).toUpperCase()}
                </div>
                <div className="project-card__info">
                  <div className="project-card__name">{project.name}</div>
                  <div className="project-card__count">
                    {project.items.length} 要素 · {placedCount} 配置済
                  </div>
                </div>
                <button
                  className="project-card__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(project.id);
                  }}
                  title="削除"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="left-sidebar__footer">
        <button
          className="btn btn--primary btn--full btn--sm"
          onClick={() => setShowCreateModal(true)}
        >
          ＋ 新規プロジェクト
        </button>
      </div>

      <ProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProject}
        mode="create"
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteProject}
        title="プロジェクトを削除"
        message={`「${deleteProjectName}」を削除しますか？この操作は取り消せません。`}
      />
    </aside>
  );
}
