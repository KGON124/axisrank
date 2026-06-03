// 2D Evaluation Map with Pan & Zoom
// - Scroll: pan the view
// - Ctrl+Scroll / Pinch: zoom
// - Drag empty space: pan
// - Drag item: move item
// - Axis labels stay fixed; content scrolls behind them

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useAppState, useCurrentProject } from "../state/hooks";
import type { Item } from "../core/types";

// Layout
const PADDING = { top: 40, right: 40, bottom: 60, left: 60 };
const ITEM_RADIUS = 14;
const DEFAULT_RANGE = 110; // show ~(-5 to 105) by default
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

// --- View state ---
interface ViewState {
  centerX: number;
  centerY: number;
  zoom: number; // 1.0 = default
}
const DEFAULT_VIEW: ViewState = { centerX: 50, centerY: 50, zoom: 1 };

// --- Drag state (item movement) ---
interface DragState {
  itemId: string;
  offsetX: number;
  offsetY: number;
}

// --- Pan state (view panning via drag) ---
interface PanState {
  startSvgX: number;
  startSvgY: number;
  startCenterX: number;
  startCenterY: number;
  hasMoved: boolean;
}

// --- Grid helpers ---
function getNiceStep(range: number): number {
  if (range <= 0) return 10;
  const rawStep = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  if (norm <= 1.5) return mag;
  if (norm <= 3.5) return 2 * mag;
  if (norm <= 7.5) return 5 * mag;
  return 10 * mag;
}

function getGridLines(min: number, max: number, step: number): number[] {
  const lines: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max + step * 0.001; v += step) {
    lines.push(Math.round(v * 1000) / 1000);
  }
  return lines;
}

export function MapView() {
  const { dispatch } = useAppState();
  const project = useCurrentProject();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // View
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW);

  // Interaction
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // --- Layout ---
  const unplacedAreaHeight = 52;
  const mapWidth = Math.max(1, dimensions.width - PADDING.left - PADDING.right);
  const mapHeight = Math.max(
    1,
    dimensions.height - PADDING.top - PADDING.bottom - unplacedAreaHeight
  );

  // --- Visible coordinate range (derived from zoom) ---
  const pixelsPerUnit = useMemo(() => {
    const base = Math.min(mapWidth, mapHeight) / DEFAULT_RANGE;
    return base * viewState.zoom;
  }, [mapWidth, mapHeight, viewState.zoom]);

  const visibleWidth = mapWidth / pixelsPerUnit;
  const visibleHeight = mapHeight / pixelsPerUnit;
  const viewMinX = viewState.centerX - visibleWidth / 2;
  const viewMaxX = viewState.centerX + visibleWidth / 2;
  const viewMinY = viewState.centerY - visibleHeight / 2;
  const viewMaxY = viewState.centerY + visibleHeight / 2;

  // --- Coordinate conversion ---
  const toSvgX = useCallback(
    (x: number) => PADDING.left + ((x - viewMinX) / visibleWidth) * mapWidth,
    [viewMinX, visibleWidth, mapWidth]
  );
  const toSvgY = useCallback(
    (y: number) => PADDING.top + ((viewMaxY - y) / visibleHeight) * mapHeight,
    [viewMaxY, visibleHeight, mapHeight]
  );
  const toInternalX = useCallback(
    (svgX: number) => viewMinX + ((svgX - PADDING.left) / mapWidth) * visibleWidth,
    [viewMinX, mapWidth, visibleWidth]
  );
  const toInternalY = useCallback(
    (svgY: number) => viewMaxY - ((svgY - PADDING.top) / mapHeight) * visibleHeight,
    [viewMaxY, mapHeight, visibleHeight]
  );

  // --- Resize observer ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e)
        setDimensions({
          width: e.contentRect.width,
          height: e.contentRect.height,
        });
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // --- Wheel handler (non-passive for preventDefault) ---
  const stateRef = useRef({ viewState, mapWidth, mapHeight });
  stateRef.current = { viewState, mapWidth, mapHeight };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { viewState: vs, mapWidth: mw, mapHeight: mh } = stateRef.current;
      const basePpu = Math.min(mw, mh) / DEFAULT_RANGE;
      const ppu = basePpu * vs.zoom;
      const vw = mw / ppu;
      const vh = mh / ppu;

      if (e.ctrlKey || e.metaKey) {
        // --- Zoom (ctrl+scroll / trackpad pinch) ---
        const zoomDelta = -e.deltaY * 0.01;
        const newZoom = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, vs.zoom * (1 + zoomDelta))
        );

        const rect = svg.getBoundingClientRect();
        const svgX = e.clientX - rect.left;
        const svgY = e.clientY - rect.top;

        const vMinX = vs.centerX - vw / 2;
        const vMaxY = vs.centerY + vh / 2;
        const cursorX = vMinX + ((svgX - PADDING.left) / mw) * vw;
        const cursorY = vMaxY - ((svgY - PADDING.top) / mh) * vh;

        const newPpu = basePpu * newZoom;
        const newVw = mw / newPpu;
        const newVh = mh / newPpu;

        const fracX = (svgX - PADDING.left) / mw;
        const fracY = (svgY - PADDING.top) / mh;
        const newCenterX = cursorX - (fracX - 0.5) * newVw;
        const newCenterY = cursorY + (fracY - 0.5) * newVh;

        setViewState({
          centerX: newCenterX,
          centerY: newCenterY,
          zoom: newZoom,
        });
      } else {
        // --- Pan (scroll / trackpad two-finger) ---
        const dx = (e.deltaX / mw) * vw;
        const dy = (e.deltaY / mh) * vh;
        setViewState({
          ...vs,
          centerX: vs.centerX + dx,
          centerY: vs.centerY - dy,
        });
      }
    };

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, []); // stable: uses ref + setState

  // --- Mouse helpers ---
  const getSvgPoint = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    []
  );

  // --- Item drag start ---
  const handleItemMouseDown = useCallback(
    (e: React.MouseEvent, item: Item) => {
      if (item.x === null || item.y === null) return;
      e.preventDefault();
      e.stopPropagation();
      const pt = getSvgPoint(e);
      const svgX = toSvgX(item.x);
      const svgY = toSvgY(item.y);
      setDragState({
        itemId: item.id,
        offsetX: pt.x - svgX,
        offsetY: pt.y - svgY,
      });
      setDragPos({ x: svgX, y: svgY });
      setSelectedItem(item.id);
    },
    [getSvgPoint, toSvgX, toSvgY]
  );

  // --- Center point drag start ---
  const handleCenterMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const pt = getSvgPoint(e);
      const cx = project?.centerPoint?.x ?? 50;
      const cy = project?.centerPoint?.y ?? 50;
      const svgX = toSvgX(cx);
      const svgY = toSvgY(cy);
      setDragState({
        itemId: "center_point",
        offsetX: pt.x - svgX,
        offsetY: pt.y - svgY,
      });
      setDragPos({ x: svgX, y: svgY });
    },
    [getSvgPoint, toSvgX, toSvgY, project]
  );

  // --- Background mousedown → start pan ---
  const viewStateRef = useRef(viewState);
  viewStateRef.current = viewState;

  const handleBgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (dragState) return;
      if (e.button !== 0) return;
      const pt = getSvgPoint(e);
      const vs = viewStateRef.current;
      setPanState({
        startSvgX: pt.x,
        startSvgY: pt.y,
        startCenterX: vs.centerX,
        startCenterY: vs.centerY,
        hasMoved: false,
      });
    },
    [dragState, getSvgPoint]
  );

  // --- Mouse move ---
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pt = getSvgPoint(e);

      if (dragState) {
        // Item drag
        setDragPos({
          x: pt.x - dragState.offsetX,
          y: pt.y - dragState.offsetY,
        });
      } else if (panState) {
        // Pan
        const dx = pt.x - panState.startSvgX;
        const dy = pt.y - panState.startSvgY;
        if (!panState.hasMoved && Math.abs(dx) < 3 && Math.abs(dy) < 3)
          return;

        const dInternalX = (dx / mapWidth) * visibleWidth;
        const dInternalY = (dy / mapHeight) * visibleHeight;

        if (!panState.hasMoved) {
          setPanState((prev) => (prev ? { ...prev, hasMoved: true } : null));
        }
        setViewState((prev) => ({
          ...prev,
          centerX: panState.startCenterX - dInternalX,
          centerY: panState.startCenterY + dInternalY,
        }));
      }
    },
    [
      dragState,
      panState,
      getSvgPoint,
      mapWidth,
      mapHeight,
      visibleWidth,
      visibleHeight,
    ]
  );

  // --- Mouse up ---
  const handleMouseUp = useCallback(() => {
    if (dragState && dragPos && project) {
      const x = toInternalX(dragPos.x);
      const y = toInternalY(dragPos.y);
      if (dragState.itemId === "center_point") {
        dispatch({
          type: "MOVE_CENTER_POINT",
          projectId: project.id,
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
        });
      } else {
        dispatch({
          type: "MOVE_ITEM",
          projectId: project.id,
          itemId: dragState.itemId,
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
        });
      }
      setDragState(null);
      setDragPos(null);
      return;
    }

    if (panState) {
      if (!panState.hasMoved) {
        // Simple click (not a drag) → deselect
        setSelectedItem(null);
      }
      setPanState(null);
    }
  }, [dragState, dragPos, panState, project, toInternalX, toInternalY, dispatch]);

  // --- Hover (stable — no state-dependent conditional rendering to avoid vibration) ---
  const handleItemHover = useCallback(
    (_e: React.MouseEvent, item: Item) => {
      if (dragState || panState?.hasMoved) return;
      setHoveredItem(item.id);
    },
    [dragState, panState]
  );

  const handleItemLeave = useCallback(() => {
    setHoveredItem(null);
  }, []);

  // --- Unplaced drag-and-drop ---
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData("text/plain");
      if (!itemId || !project) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const svgX = e.clientX - rect.left;
      const svgY = e.clientY - rect.top;
      dispatch({
        type: "MOVE_ITEM",
        projectId: project.id,
        itemId,
        x: Math.round(toInternalX(svgX) * 10) / 10,
        y: Math.round(toInternalY(svgY) * 10) / 10,
      });
    },
    [project, toInternalX, toInternalY, dispatch]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => e.preventDefault(),
    []
  );
  const handleChipDragStart = useCallback(
    (e: React.DragEvent, itemId: string) => {
      e.dataTransfer.setData("text/plain", itemId);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  // --- Reset view ---
  const handleResetView = useCallback(
    () => setViewState(DEFAULT_VIEW),
    []
  );

  // --- Grid ---
  const xStep = getNiceStep(visibleWidth);
  const yStep = getNiceStep(visibleHeight);
  const xGridLines = useMemo(
    () => getGridLines(viewMinX, viewMaxX, xStep),
    [viewMinX, viewMaxX, xStep]
  );
  const yGridLines = useMemo(
    () => getGridLines(viewMinY, viewMaxY, yStep),
    [viewMinY, viewMaxY, yStep]
  );

  // --- Empty state ---
  if (!project) {
    return (
      <div className="map-area">
        <div className="empty-state" style={{ height: "100%" }}>
          <div className="empty-state__icon">🗺️</div>
          <div className="empty-state__title">プロジェクトを選択</div>
          <div className="empty-state__description">
            左のサイドバーからプロジェクトを選択するか、新しいプロジェクトを作成してください
          </div>
        </div>
      </div>
    );
  }

  const placedItems = project.items.filter(
    (i) => i.x !== null && i.y !== null
  );
  const unplacedItems = project.items.filter(
    (i) => i.x === null || i.y === null
  );

  const getItemFill = (item: Item) => {
    if (item.rank === 1) return "url(#goldGradient)";
    if (item.rank === 2) return "url(#silverGradient)";
    if (item.rank === 3) return "url(#bronzeGradient)";
    return "url(#defaultGradient)";
  };

  const isPanning = panState?.hasMoved;
  const svgHeight = dimensions.height - unplacedAreaHeight;

  const cxVal = project.centerPoint?.x ?? 50;
  const cyVal = project.centerPoint?.y ?? 50;
  const isCenterDragging = dragState?.itemId === "center_point";
  const centerSvgX = isCenterDragging && dragPos ? dragPos.x : toSvgX(cxVal);
  const centerSvgY = isCenterDragging && dragPos ? dragPos.y : toSvgY(cyVal);

  return (
    <div className="map-area" ref={containerRef}>
      <div className="map-container">
        <svg
          ref={svgRef}
          className={`map-svg ${isPanning ? "map-svg--panning" : ""}`}
          width={dimensions.width}
          height={svgHeight}
          onMouseDown={handleBgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <defs>
            <clipPath id="mapClip">
              <rect
                x={PADDING.left}
                y={PADDING.top}
                width={mapWidth}
                height={mapHeight}
              />
            </clipPath>
            <radialGradient id="goldGradient">
              <stop offset="0%" stopColor="var(--rank-1)" stopOpacity="1" />
              <stop offset="60%" stopColor="var(--rank-1)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--rank-1)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="silverGradient">
              <stop offset="0%" stopColor="var(--rank-2)" stopOpacity="1" />
              <stop offset="60%" stopColor="var(--rank-2)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--rank-2)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bronzeGradient">
              <stop offset="0%" stopColor="var(--rank-3)" stopOpacity="1" />
              <stop offset="60%" stopColor="var(--rank-3)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--rank-3)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="defaultGradient">
              <stop offset="0%" stopColor="var(--rank-default)" stopOpacity="1" />
              <stop offset="60%" stopColor="var(--rank-default)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--rank-default)" stopOpacity="0" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect
            x={0}
            y={0}
            width={dimensions.width}
            height={svgHeight}
            className="map-bg"
          />

          {/* --- Clipped content area (scrolls with pan/zoom) --- */}
          <g clipPath="url(#mapClip)">
            {/* Radar / FUI Grid Lines */}
            {xGridLines.map((v) => {
              const x = toSvgX(v);
              const emphasis = v === 0 || v === 100;
              return (
                <line
                  key={`gx-${v}`}
                  x1={x}
                  y1={PADDING.top}
                  x2={x}
                  y2={PADDING.top + mapHeight}
                  stroke={
                    emphasis
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(255,255,255,0.05)"
                  }
                  strokeWidth={emphasis ? 1 : 0.5}
                  strokeDasharray={emphasis ? undefined : "2,4"}
                />
              );
            })}
            {yGridLines.map((v) => {
              const y = toSvgY(v);
              const emphasis = v === 0 || v === 100;
              return (
                <line
                  key={`gy-${v}`}
                  x1={PADDING.left}
                  y1={y}
                  x2={PADDING.left + mapWidth}
                  y2={y}
                  stroke={
                    emphasis
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(255,255,255,0.05)"
                  }
                  strokeWidth={emphasis ? 1 : 0.5}
                  strokeDasharray={emphasis ? undefined : "2,4"}
                />
              );
            })}

            {/* Radar Concentric Circles at Center */}
            <circle cx={centerSvgX} cy={centerSvgY} r={(mapWidth/DEFAULT_RANGE) * 20 * viewState.zoom} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} strokeDasharray="4,4" pointerEvents="none" />
            <circle cx={centerSvgX} cy={centerSvgY} r={(mapWidth/DEFAULT_RANGE) * 40 * viewState.zoom} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} strokeDasharray="2,6" pointerEvents="none" />

            {/* Draggable Center cross */}
            <g
              onMouseDown={handleCenterMouseDown}
              style={{ cursor: isCenterDragging ? "grabbing" : "grab" }}
            >
              {/* Hit Area */}
              <circle cx={centerSvgX} cy={centerSvgY} r={20} fill="transparent" pointerEvents="all" />
              <line
                x1={centerSvgX}
                y1={PADDING.top}
                x2={centerSvgX}
                y2={PADDING.top + mapHeight}
                stroke="var(--accent-tertiary)"
                strokeOpacity={0.4}
                strokeWidth={1}
                pointerEvents="none"
              />
              <line
                x1={PADDING.left}
                y1={centerSvgY}
                x2={PADDING.left + mapWidth}
                y2={centerSvgY}
                stroke="var(--accent-tertiary)"
                strokeOpacity={0.4}
                strokeWidth={1}
                pointerEvents="none"
              />
              <circle cx={centerSvgX} cy={centerSvgY} r={4} fill="var(--accent-tertiary)" pointerEvents="none" />
              {isCenterDragging && (
                <circle cx={centerSvgX} cy={centerSvgY} r={20} fill="none" stroke="var(--accent-tertiary)" strokeWidth={1} strokeDasharray="2,2" pointerEvents="none" opacity={0.5} />
              )}
            </g>

            {/* --- Items --- */}
            {placedItems.map((item) => {
              const isDragging = dragState?.itemId === item.id;
              const cx =
                isDragging && dragPos ? dragPos.x : toSvgX(item.x!);
              const cy =
                isDragging && dragPos ? dragPos.y : toSvgY(item.y!);
              const isSelected = selectedItem === item.id;
              const isHovered = hoveredItem === item.id;

              return (
                <g
                  key={item.id}
                  onMouseDown={(e) => handleItemMouseDown(e, item)}
                  onMouseEnter={(e) => handleItemHover(e, item)}
                  onMouseLeave={handleItemLeave}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item.id);
                  }}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  filter={
                    isDragging || isSelected ? "url(#glow)" : undefined
                  }
                >
                  {/* Hit Area (Invisible but captures mouse events) */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={ITEM_RADIUS + 10}
                    fill="transparent"
                    pointerEvents="all"
                  />
                  {/* Outer FUI Ring */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={ITEM_RADIUS + 4}
                    fill="none"
                    stroke={
                      isSelected
                        ? "var(--accent-primary)"
                        : "var(--accent-tertiary)"
                    }
                    strokeWidth={isSelected ? 1.5 : 0.5}
                    opacity={isSelected || isHovered ? 1 : 0.2}
                    style={{ transition: "opacity 150ms ease, r 150ms ease, fill 150ms ease, stroke 150ms ease, stroke-width 150ms ease" }}
                    pointerEvents="none"
                  />
                  {/* Radial Gradient Glow */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={ITEM_RADIUS + (isHovered || isSelected ? 4 : 0)}
                    fill={getItemFill(item)}
                    opacity={isHovered || isSelected ? 0.9 : 0.6}
                    style={{ transition: "opacity 150ms ease, r 150ms ease, fill 150ms ease, stroke 150ms ease, stroke-width 150ms ease" }}
                    pointerEvents="none"
                  />
                  {/* Center Dot */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill="var(--item-dot)"
                    pointerEvents="none"
                  />
                  {/* Rank badge - Lower priority visual weight */}
                  {item.rank !== undefined && (
                    <text
                      x={cx}
                      y={cy - ITEM_RADIUS - 6}
                      textAnchor="middle"
                      dominantBaseline="auto"
                      fontSize={10}
                      fontFamily="monospace"
                      fontWeight="normal"
                      fill="var(--text-secondary)"
                      pointerEvents="none"
                    >
                      R{item.rank}
                    </text>
                  )}
                  {/* Label - BOLD and higher priority */}
                  <text
                    x={cx}
                    y={cy + ITEM_RADIUS + 16}
                    className="map-item__label"
                    pointerEvents="none"
                    fontWeight="bold"
                    fill="var(--text-primary)"
                    fontSize={12}
                    textAnchor="middle"
                    letterSpacing="1px"
                  >
                    {item.name}
                  </text>

                  {/* --- Selected Item FUI Dashboard (Callout) --- */}
                  {isSelected && (
                    <g pointerEvents="none">
                      {/* Callout Line (45 deg up-right, then horizontal) */}
                      <path
                        d={`M ${cx + ITEM_RADIUS + 6} ${cy - ITEM_RADIUS - 6} L ${cx + 40} ${cy - 40} L ${cx + 200} ${cy - 40}`}
                        fill="none"
                        stroke="var(--border-strong)"
                        strokeWidth={1}
                      />
                      <circle cx={cx + 40} cy={cy - 40} r={2} fill="var(--border-strong)" />
                      <circle cx={cx + 200} cy={cy - 40} r={2} fill="var(--border-strong)" />
                      
                      {/* Dashboard Panel using foreignObject */}
                      <foreignObject
                        x={cx + 40}
                        y={cy - 120}
                        width={220}
                        height={76}
                      >
                        <div style={{
                          background: "var(--glass-bg)",
                          border: "1px solid var(--border-accent)",
                          borderRadius: "var(--radius-sm)",
                          padding: "8px 12px",
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-family)",
                          boxShadow: "var(--shadow-md), inset 0 0 10px var(--accent-glow)",
                          pointerEvents: "auto",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px"
                        }}>
                          <div style={{ fontSize: "12px", fontWeight: "bold", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "4px", marginBottom: "2px", display: "flex", justifyContent: "space-between" }}>
                            <span>{item.name}</span>
                            <span style={{ color: "var(--accent-primary)", fontFamily: "monospace" }}>#{item.rank ?? "-"}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                            <span style={{ textTransform: "uppercase" }}>X: {project.axes.x.name}</span>
                            <span style={{ color: "var(--text-primary)" }}>{item.x?.toFixed(1)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                            <span style={{ textTransform: "uppercase" }}>Y: {project.axes.y.name}</span>
                            <span style={{ color: "var(--text-primary)" }}>{item.y?.toFixed(1)}</span>
                          </div>
                        </div>
                      </foreignObject>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* --- Fixed elements (axis labels, border, ticks) --- */}

          {/* Map border */}
          <rect
            x={PADDING.left}
            y={PADDING.top}
            width={mapWidth}
            height={mapHeight}
            fill="none"
            stroke="var(--border-default)"
            strokeWidth={1}
            rx={4}
            pointerEvents="none"
          />

          {/* X tick labels */}
          {xGridLines.map((v) => {
            const x = toSvgX(v);
            if (x < PADDING.left - 5 || x > PADDING.left + mapWidth + 5)
              return null;
            const displayV = 50 + (v - cxVal);
            return (
              <text
                key={`tx-${v}`}
                x={x}
                y={PADDING.top + mapHeight + 16}
                textAnchor="middle"
                className="map-label--min-max"
                pointerEvents="none"
              >
                {Number.isInteger(displayV) ? displayV : displayV.toFixed(1)}
              </text>
            );
          })}

          {/* Y tick labels */}
          {yGridLines.map((v) => {
            const y = toSvgY(v);
            if (y < PADDING.top - 5 || y > PADDING.top + mapHeight + 5)
              return null;
            const displayV = 50 + (v - cyVal);
            return (
              <text
                key={`ty-${v}`}
                x={PADDING.left - 8}
                y={y + 4}
                textAnchor="end"
                className="map-label--min-max"
                pointerEvents="none"
              >
                {Number.isInteger(displayV) ? displayV : displayV.toFixed(1)}
              </text>
            );
          })}

          {/* X axis name */}
          <text
            x={PADDING.left + mapWidth / 2}
            y={PADDING.top + mapHeight + 40}
            textAnchor="middle"
            className="map-label--axis-name"
            pointerEvents="none"
          >
            {project.axes.x.name}
            <tspan className="map-label--min-max" dx={8}>
              ({project.axes.x.minLabel} → {project.axes.x.maxLabel})
            </tspan>
          </text>

          {/* Y axis name */}
          <text
            x={16}
            y={PADDING.top + mapHeight / 2}
            textAnchor="middle"
            className="map-label--axis-name"
            transform={`rotate(-90, 16, ${PADDING.top + mapHeight / 2})`}
            pointerEvents="none"
          >
            {project.axes.y.name}
          </text>
        </svg>

        {/* Zoom controls */}
        <div className="map-controls">
          <button
            className="btn btn--secondary btn--icon btn--sm"
            onClick={handleResetView}
            title="ビューをリセット"
          >
            ⟲
          </button>
          <span className="map-controls__zoom">
            {Math.round(viewState.zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Unplaced items area */}
      <div className="unplaced-area">
        <span className="unplaced-area__label">未配置：</span>
        {unplacedItems.length === 0 ? (
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--text-muted)",
            }}
          >
            すべての要素が配置済みです
          </span>
        ) : (
          unplacedItems.map((item) => (
            <div
              key={item.id}
              className="unplaced-chip"
              draggable
              onDragStart={(e) => handleChipDragStart(e, item.id)}
            >
              {item.name}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
