// Right Sidebar - Ranking list

import { useState } from "react";
import { useAppState, useCurrentProject } from "../state/hooks";
import { useSortedItems } from "../state/hooks";
import { ItemModal } from "./modals/ItemModal";
import { ConfirmDialog } from "./modals/ConfirmDialog";
import type { SortConfig, SortKey, Item } from "../core/types";

export function RightSidebar() {
  const { dispatch } = useAppState();
  const project = useCurrentProject();
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "rank",
    direction: "asc",
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const sortedItems = useSortedItems(project?.items ?? [], sortConfig);

  const handleAddItem = (name: string, description?: string, url?: string, tags?: string[], memo?: string) => {
    if (!project) return;
    dispatch({ 
      type: "ADD_ITEM", 
      projectId: project.id, 
      item: { name, description, url, tags: tags ?? [], memo }
    });
  };

  const handleUpdateItem = (name: string, description?: string, url?: string, tags?: string[], memo?: string) => {
    if (!project || !editingItem) return;
    dispatch({
      type: "UPDATE_ITEM",
      projectId: project.id,
      itemId: editingItem.id,
      updates: { name, description, url, tags: tags ?? [], memo },
    });
    setEditingItem(null);
  };

  const handleDeleteItem = () => {
    if (!project || !deleteTarget) return;
    dispatch({ type: "DELETE_ITEM", projectId: project.id, itemId: deleteTarget });
    setDeleteTarget(null);
  };

  const handleSortChange = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const deleteItemName = deleteTarget
    ? project?.items.find((i) => i.id === deleteTarget)?.name ?? ""
    : "";

  if (!project) {
    return (
      <aside className="right-sidebar">
        <div className="empty-state" style={{ height: "100%" }}>
          <div className="empty-state__icon">📊</div>
          <div className="empty-state__title">ランキング</div>
          <div className="empty-state__description">
            プロジェクトを選択すると、ランキングが表示されます
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="right-sidebar">
      <div className="right-sidebar__header">
        <div className="right-sidebar__title-row">
          <span className="right-sidebar__title">ランキング</span>
          <button
            className="btn btn--primary btn--sm"
            onClick={() => setShowAddModal(true)}
          >
            ＋ 要素追加
          </button>
        </div>
        <div className="right-sidebar__sort">
          <select
            value={sortConfig.key}
            onChange={(e) => handleSortChange(e.target.value as SortKey)}
          >
            <option value="rank">総合ランキング</option>
            <option value="xRank">{project.axes.x.name}ランキング</option>
            <option value="yRank">{project.axes.y.name}ランキング</option>
            <option value="x">{project.axes.x.name}値</option>
            <option value="y">{project.axes.y.name}値</option>
            <option value="name">名前</option>
            <option value="createdAt">作成日</option>
            <option value="updatedAt">更新日</option>
          </select>
          <button
            className="btn btn--ghost btn--icon btn--sm"
            onClick={() =>
              setSortConfig((prev) => ({
                ...prev,
                direction: prev.direction === "asc" ? "desc" : "asc",
              }))
            }
            title={sortConfig.direction === "asc" ? "昇順" : "降順"}
          >
            {sortConfig.direction === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      <div className="right-sidebar__list">
        {sortedItems.length === 0 ? (
          <div className="empty-state" style={{ padding: "var(--space-8) var(--space-4)" }}>
            <div className="empty-state__icon">📝</div>
            <div className="empty-state__title">要素なし</div>
            <div className="empty-state__description">
              「＋ 要素追加」から要素を追加してください
            </div>
          </div>
        ) : (
          sortedItems.map((item) => {
            const isPlaced = item.x !== null && item.y !== null;
            const rankClass =
              item.rank === 1
                ? "ranking-item__rank--1"
                : item.rank === 2
                  ? "ranking-item__rank--2"
                  : item.rank === 3
                    ? "ranking-item__rank--3"
                    : "";

            return (
              <div
                key={item.id}
                className={`ranking-item ${!isPlaced ? "ranking-item--unplaced" : ""}`}
                onDoubleClick={() => setEditingItem(item)}
              >
                {/* Rank badge */}
                <div className={`ranking-item__rank ${rankClass}`}>
                  {isPlaced && item.rank !== undefined ? item.rank : "—"}
                </div>

                {/* Info */}
                <div className="ranking-item__info">
                  <div className="ranking-item__name">{item.name}</div>
                  <div className="ranking-item__stats">
                    {isPlaced ? (
                      <>
                        <span className="ranking-item__stat">
                          <span className="ranking-item__stat-label">
                            {project.axes.x.name}:
                          </span>{" "}
                          {item.x?.toFixed(0)}
                          {item.xRank !== undefined && (
                            <span className="ranking-item__stat-label">
                              {" "}(#{item.xRank})
                            </span>
                          )}
                        </span>
                        <span className="ranking-item__stat">
                          <span className="ranking-item__stat-label">
                            {project.axes.y.name}:
                          </span>{" "}
                          {item.y?.toFixed(0)}
                          {item.yRank !== undefined && (
                            <span className="ranking-item__stat-label">
                              {" "}(#{item.yRank})
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      <span className="ranking-item__stat" style={{ color: "var(--warning)" }}>
                        未配置
                      </span>
                    )}
                  </div>
                  {item.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                      {item.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Score */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", marginLeft: "12px", marginRight: "12px" }}>
                  {isPlaced && item.score !== undefined && (
                    <div className="ranking-item__score">
                      {item.score.toFixed(1)}
                    </div>
                  )}
                  {isPlaced && project.scoreConfig?.enabled && item.assignedScore !== undefined && (
                    <div className="score-badge">
                      <span className="score-badge__value" title="配点スコア">
                        {project.scoreConfig.roundingMode === "continuous"
                          ? item.assignedScore.toFixed(1)
                          : item.assignedScore}
                      </span>
                      {item.passStatus && (
                        <span className={`pass-status pass-status--${item.passStatus}`}>
                          {item.passStatus === "pass" ? "PASS" : item.passStatus === "borderline" ? "BORDER" : "FAIL"}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="ranking-item__actions">
                  <button
                    className="btn btn--ghost btn--icon btn--sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingItem(item);
                    }}
                    title="編集"
                  >
                    ✎
                  </button>
                  <button
                    className="btn btn--ghost btn--icon btn--sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(item.id);
                    }}
                    title="削除"
                  >
                    ✕
                  </button>
                </div>

                {/* Score bar */}
                {isPlaced && item.score !== undefined && (
                  <div
                    className="ranking-item__bar"
                    style={{ width: `${item.score}%` }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <ItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddItem}
        mode="add"
      />

      {editingItem && (
        <ItemModal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          onSubmit={handleUpdateItem}
          initialName={editingItem.name}
          initialDescription={editingItem.description ?? ""}
          initialUrl={editingItem.url ?? ""}
          initialTags={editingItem.tags}
          initialMemo={editingItem.memo ?? ""}
          mode="edit"
        />
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteItem}
        title="要素を削除"
        message={`「${deleteItemName}」を削除しますか？`}
      />
    </aside>
  );
}
