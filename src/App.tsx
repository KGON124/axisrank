// AxisRank - Main App Component

import { AppProvider } from "./state/context";
import { Header } from "./components/Header";
import { LeftSidebar } from "./components/LeftSidebar";
import { MapView } from "./components/MapView";
import { RightSidebar } from "./components/RightSidebar";
import "./styles/index.css";
import "./styles/layout.css";
import "./styles/components.css";

import { useEffect } from "react";
import { useAppState } from "./state/hooks";

function AppContent() {
  const { state } = useAppState();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", state.theme);
  }, [state.theme]);

  return (
    <div className="app-layout">
      <Header />
      <LeftSidebar />
      <MapView />
      <RightSidebar />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
