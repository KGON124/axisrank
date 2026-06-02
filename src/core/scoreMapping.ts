import type { PassStatus, ScoreConfig } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function mapRelativeValueToScore(
  relativeValue: number,
  config: ScoreConfig
): number {
  const rel = clamp(relativeValue, 0, 1);
  const comp = clamp(config.compression, 0, 1);
  
  let score = 0;
  
  if (config.mode === "linear") {
    score = config.minScore + rel * (config.maxScore - config.minScore);
  } else if (config.mode === "compressed") {
    const adjusted = 0.5 + comp * (rel - 0.5);
    score = config.minScore + adjusted * (config.maxScore - config.minScore);
  } else if (config.mode === "pass_anchored") {
    const adjusted = 0.5 + comp * (rel - 0.5);
    const pass = clamp(config.passScore, config.minScore, config.maxScore);
    
    if (adjusted < 0.5) {
      score = config.minScore + (adjusted / 0.5) * (pass - config.minScore);
    } else {
      score = pass + ((adjusted - 0.5) / 0.5) * (config.maxScore - pass);
    }
  }

  // Rounding
  if (config.roundingMode === "integer") {
    score = Math.round(score);
  } else if (config.roundingMode === "step") {
    if (config.steps <= 1) {
      score = (config.minScore + config.maxScore) / 2;
    } else {
      const stepSize = (config.maxScore - config.minScore) / (config.steps - 1);
      const stepIndex = Math.round((score - config.minScore) / stepSize);
      score = config.minScore + stepIndex * stepSize;
    }
  }

  return clamp(score, config.minScore, config.maxScore);
}

export function getPassStatus(
  assignedScore: number,
  config: ScoreConfig
): PassStatus {
  const margin = Math.max(0, config.borderlineMargin);
  if (assignedScore >= config.passScore) {
    return "pass";
  }
  if (assignedScore >= config.passScore - margin) {
    return "borderline";
  }
  return "fail";
}

export function getScoreBreakpoints(config: ScoreConfig): number[] {
  if (config.steps <= 1) return [(config.minScore + config.maxScore) / 2];
  
  const stepSize = (config.maxScore - config.minScore) / (config.steps - 1);
  const breakpoints: number[] = [];
  for (let i = 0; i < config.steps; i++) {
    breakpoints.push(config.minScore + i * stepSize);
  }
  return breakpoints;
}
