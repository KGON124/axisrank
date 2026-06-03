// Ranking calculation engine
// Recalculates normalized scores and ranks for all items in a project

import type { Project, Item } from "./types";
import { mapRelativeValueToScore, getPassStatus } from "./scoreMapping";

/**
 * Recalculate all rankings for a project.
 * Triggered on: item add/delete/move, axis config change, weight change.
 */
export function recalculateProject(project: Project): Project {
  const placedItems = project.items.filter(
    (item) => item.x !== null && item.y !== null
  );

  // If no placed items, clear all rankings
  if (placedItems.length === 0) {
    return {
      ...project,
      items: project.items.map((item) => ({
        ...item,
        normalizedX: undefined,
        normalizedY: undefined,
        score: undefined,
        rank: undefined,
        xRank: undefined,
        yRank: undefined,
        relativeValue: undefined,
        assignedScore: undefined,
        scoreRank: undefined,
        passStatus: undefined,
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  const cx = project.centerPoint?.x ?? 50;
  const cy = project.centerPoint?.y ?? 50;

  const xWeight = project.axes.x.weight;
  const yWeight = project.axes.y.weight;
  const weightSum = xWeight + yWeight;
  const normalizedXWeight = weightSum === 0 ? 0.5 : xWeight / weightSum;
  const normalizedYWeight = weightSum === 0 ? 0.5 : yWeight / weightSum;

  // Score all items
  const scoredItems: Item[] = project.items.map((item) => {
    if (item.x === null || item.y === null) {
      return {
        ...item,
        normalizedX: undefined,
        normalizedY: undefined,
        score: undefined,
        rank: undefined,
        xRank: undefined,
        yRank: undefined,
        relativeValue: undefined,
        assignedScore: undefined,
        scoreRank: undefined,
        passStatus: undefined,
      };
    }

    // Normalize based on center point (0.5 mark) with a fixed scale of 100
    // So distance of 50 from center reaches 0.0 or 1.0. Clamp between 0 and 1.
    let normalizedX = Math.max(0, Math.min(1, 0.5 + (item.x - cx) / 100));
    let normalizedY = Math.max(0, Math.min(1, 0.5 + (item.y - cy) / 100));

    // Flip for "lower_is_better"
    if (project.axes.x.direction === "lower_is_better") {
      normalizedX = 1 - normalizedX;
    }
    if (project.axes.y.direction === "lower_is_better") {
      normalizedY = 1 - normalizedY;
    }

    // Weighted sum (relativeValue 0-1)
    const relativeValue = normalizedX * normalizedXWeight + normalizedY * normalizedYWeight;
    
    // Existing score (0-100)
    const score = relativeValue * 100;

    let assignedScore: number;
    let passStatus: Item["passStatus"] = undefined;

    if (project.scoreConfig.enabled) {
      assignedScore = mapRelativeValueToScore(relativeValue, project.scoreConfig);
      passStatus = getPassStatus(assignedScore, project.scoreConfig);
    } else {
      assignedScore = score;
    }

    return {
      ...item,
      normalizedX,
      normalizedY,
      score,
      relativeValue,
      assignedScore,
      passStatus,
    };
  });

  // Assign ranks
  const rankedItems = assignRanks(scoredItems, project.axes.x.direction, project.axes.y.direction);

  return {
    ...project,
    items: rankedItems,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Assign overall rank, xRank, and yRank to scored items.
 * Handles ties (same score = same rank).
 */
function assignRanks(
  items: Item[],
  xDirection: string,
  yDirection: string
): Item[] {
  const placed = items.filter(
    (item) => item.score !== undefined && item.score !== null
  );

  // Overall rank by score (descending - higher is better)
  const byScore = [...placed].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const overallRanks = computeRankMap(byScore, (item) => item.score ?? 0);

  // Score rank by assignedScore (descending)
  const byAssignedScore = [...placed].sort((a, b) => (b.assignedScore ?? 0) - (a.assignedScore ?? 0));
  const scoreRanks = computeRankMap(byAssignedScore, (item) => item.assignedScore ?? 0);

  // X rank
  const xDescending = xDirection === "higher_is_better";
  const byX = [...placed].sort((a, b) =>
    xDescending
      ? (b.normalizedX ?? 0) - (a.normalizedX ?? 0)
      : (a.normalizedX ?? 0) - (b.normalizedX ?? 0)
  );
  const xRanks = computeRankMap(byX, (item) => item.normalizedX ?? 0);

  // Y rank
  const yDescending = yDirection === "higher_is_better";
  const byY = [...placed].sort((a, b) =>
    yDescending
      ? (b.normalizedY ?? 0) - (a.normalizedY ?? 0)
      : (a.normalizedY ?? 0) - (b.normalizedY ?? 0)
  );
  const yRanks = computeRankMap(byY, (item) => item.normalizedY ?? 0);

  return items.map((item) => {
    if (item.score === undefined) return item;
    return {
      ...item,
      rank: overallRanks.get(item.id) ?? undefined,
      scoreRank: scoreRanks.get(item.id) ?? undefined,
      xRank: xRanks.get(item.id) ?? undefined,
      yRank: yRanks.get(item.id) ?? undefined,
    };
  });
}

/**
 * Compute rank map from a sorted array.
 * Items with the same value get the same rank.
 */
function computeRankMap(
  sortedItems: Item[],
  getValue: (item: Item) => number
): Map<string, number> {
  const rankMap = new Map<string, number>();
  let currentRank = 1;

  for (let i = 0; i < sortedItems.length; i++) {
    if (i > 0 && getValue(sortedItems[i]) !== getValue(sortedItems[i - 1])) {
      currentRank = i + 1;
    }
    rankMap.set(sortedItems[i].id, currentRank);
  }

  return rankMap;
}
