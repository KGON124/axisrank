// AxisRank Core Type Definitions

export type AxisDirection = "higher_is_better" | "lower_is_better";

export type RankingMode = "weighted_sum" | "distance_to_ideal";

export interface Axis {
  name: string;
  minLabel: string;
  maxLabel: string;
  direction: AxisDirection;
  weight: number;
}

export interface AxisConfig {
  x: Axis;
  y: Axis;
}

export interface RankingConfig {
  mode: RankingMode;
  idealPoint: {
    x: number;
    y: number;
  };
}

export type ScoreMappingMode = "linear" | "compressed" | "pass_anchored";
export type ScoreRoundingMode = "continuous" | "integer" | "step";
export type PassStatus = "pass" | "borderline" | "fail";

export interface ScoreConfig {
  enabled: boolean;
  minScore: number;
  maxScore: number;
  steps: number;
  passScore: number;
  borderlineMargin: number;
  mode: ScoreMappingMode;
  /**
   * 1.0 = no compression
   * 0.8 = pulls values slightly toward center
   * 0.0 = all values collapse to center
   */
  compression: number;
  roundingMode: ScoreRoundingMode;
}

export const defaultScoreConfig: ScoreConfig = {
  enabled: true,
  minScore: 1,
  maxScore: 10,
  steps: 10,
  passScore: 6,
  borderlineMargin: 0.5,
  mode: "pass_anchored",
  compression: 0.8,
  roundingMode: "integer",
};

export interface Item {
  id: string;
  name: string;
  description?: string;
  x: number | null;
  y: number | null;
  normalizedX?: number;
  normalizedY?: number;
  score?: number;
  rank?: number;
  xRank?: number;
  yRank?: number;
  relativeValue?: number;
  assignedScore?: number;
  scoreRank?: number;
  passStatus?: PassStatus;
  tags: string[];
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  axes: AxisConfig;
  rankingConfig: RankingConfig;
  scoreConfig: ScoreConfig;
  items: Item[];
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  theme: "dark" | "light";
}

// Sort options for the ranking sidebar
export type SortKey =
  | "rank"
  | "xRank"
  | "yRank"
  | "x"
  | "y"
  | "name"
  | "createdAt"
  | "updatedAt";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

// Helper to create default axis
export function createDefaultAxis(
  name: string,
  minLabel: string,
  maxLabel: string
): Axis {
  return {
    name,
    minLabel,
    maxLabel,
    direction: "higher_is_better",
    weight: 0.5,
  };
}

// Helper to create a new project
export function createNewProject(name: string, description?: string): Project {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    description,
    axes: {
      x: createDefaultAxis("X軸", "低い", "高い"),
      y: createDefaultAxis("Y軸", "低い", "高い"),
    },
    rankingConfig: {
      mode: "weighted_sum",
      idealPoint: { x: 100, y: 100 },
    },
    scoreConfig: defaultScoreConfig,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
}

// Helper to create a new item (unplaced)
export function createNewItem(name: string, description?: string): Item {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    description,
    x: null,
    y: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}
