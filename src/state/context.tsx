// App state management with React Context + useReducer

import React, { createContext, useReducer, useEffect } from "react";
import type {
  AppState,
  Project,
  AxisConfig,
  Item,
  ScoreConfig,
} from "../core/types";
import { createNewProject, createNewItem } from "../core/types";
import { recalculateProject } from "../core/ranking";
import { loadState, createDebouncedSave } from "../core/storage";

// ---------- Actions ----------

export type AppAction =
  | { type: "CREATE_PROJECT"; name: string; description?: string }
  | { type: "UPDATE_PROJECT"; projectId: string; name: string; description?: string }
  | { type: "DELETE_PROJECT"; projectId: string }
  | { type: "SET_CURRENT_PROJECT"; projectId: string }
  | { type: "UPDATE_AXES"; projectId: string; axes: AxisConfig }
  | { type: "ADD_ITEM"; projectId: string; name: string; description?: string }
  | { type: "UPDATE_ITEM"; projectId: string; itemId: string; updates: Partial<Pick<Item, "name" | "description" | "tags" | "memo">> }
  | { type: "MOVE_ITEM"; projectId: string; itemId: string; x: number; y: number }
  | { type: "MOVE_CENTER_POINT"; projectId: string; x: number; y: number }
  | { type: "DELETE_ITEM"; projectId: string; itemId: string }
  | { type: "LOAD_STATE"; state: AppState }
  | { type: "SET_THEME"; theme: "dark" | "light" }
  | { type: "UPDATE_SCORE_CONFIG"; payload: { projectId: string; scoreConfig: ScoreConfig } };

// ---------- Initial State ----------

const initialState: AppState = {
  projects: [],
  currentProjectId: null,
  theme: "dark",
};

// ---------- Reducer ----------

function updateProjectInState(
  state: AppState,
  projectId: string,
  updater: (project: Project) => Project
): AppState {
  return {
    ...state,
    projects: state.projects.map((p) =>
      p.id === projectId ? updater(p) : p
    ),
  };
}

function recalcAndUpdate(
  state: AppState,
  projectId: string,
  updater: (project: Project) => Project
): AppState {
  return updateProjectInState(state, projectId, (project) =>
    recalculateProject(updater(project))
  );
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "CREATE_PROJECT": {
      const newProject = createNewProject(action.name, action.description);
      return {
        ...state,
        projects: [...state.projects, newProject],
        currentProjectId: newProject.id,
      };
    }

    case "UPDATE_PROJECT": {
      return updateProjectInState(state, action.projectId, (project) => ({
        ...project,
        name: action.name,
        description: action.description,
        updatedAt: new Date().toISOString(),
      }));
    }

    case "DELETE_PROJECT": {
      const filtered = state.projects.filter((p) => p.id !== action.projectId);
      const newCurrentId =
        state.currentProjectId === action.projectId
          ? filtered.length > 0
            ? filtered[0].id
            : null
          : state.currentProjectId;
      return {
        ...state,
        projects: filtered,
        currentProjectId: newCurrentId,
      };
    }

    case "SET_CURRENT_PROJECT": {
      return {
        ...state,
        currentProjectId: action.projectId,
      };
    }

    case "UPDATE_AXES": {
      return recalcAndUpdate(state, action.projectId, (project) => ({
        ...project,
        axes: action.axes,
      }));
    }

    case "ADD_ITEM": {
      const newItem = createNewItem(action.name, action.description);
      return recalcAndUpdate(state, action.projectId, (project) => ({
        ...project,
        items: [...project.items, newItem],
      }));
    }

    case "UPDATE_ITEM": {
      return recalcAndUpdate(state, action.projectId, (project) => ({
        ...project,
        items: project.items.map((item) =>
          item.id === action.itemId
            ? {
                ...item,
                ...action.updates,
                updatedAt: new Date().toISOString(),
              }
            : item
        ),
      }));
    }

    case "MOVE_ITEM": {
      return recalcAndUpdate(state, action.projectId, (project) => ({
        ...project,
        items: project.items.map((item) =>
          item.id === action.itemId
            ? {
                ...item,
                x: action.x,
                y: action.y,
                updatedAt: new Date().toISOString(),
              }
            : item
        ),
      }));
    }

    case "MOVE_CENTER_POINT": {
      return recalcAndUpdate(state, action.projectId, (project) => ({
        ...project,
        centerPoint: { x: action.x, y: action.y },
        updatedAt: new Date().toISOString(),
      }));
    }

    case "DELETE_ITEM": {
      return recalcAndUpdate(state, action.projectId, (project) => ({
        ...project,
        items: project.items.filter((item) => item.id !== action.itemId),
      }));
    }

    case "LOAD_STATE": {
      return {
        ...action.state,
        theme: action.state.theme || "dark",
      };
    }

    case "SET_THEME": {
      return {
        ...state,
        theme: action.theme,
      };
    }

    case "UPDATE_SCORE_CONFIG": {
      return recalcAndUpdate(state, action.payload.projectId, (project) => ({
        ...project,
        scoreConfig: action.payload.scoreConfig,
        updatedAt: new Date().toISOString(),
      }));
    }

    default:
      return state;
  }
}

// ---------- Context ----------

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export const AppContext = createContext<AppContextValue>({
  state: initialState,
  dispatch: () => {},
});

// ---------- Provider ----------

const debouncedSave = createDebouncedSave(500);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, () => {
    const saved = loadState();
    return saved ?? initialState;
  });

  // Auto-save on state changes
  useEffect(() => {
    debouncedSave(state);
  }, [state]);

  const contextValue = React.useMemo(
    () => ({ state, dispatch }),
    [state, dispatch]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
