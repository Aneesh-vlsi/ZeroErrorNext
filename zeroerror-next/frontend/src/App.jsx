import { useEffect, useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import HardwarePanel from "./components/HardwarePanel";
import SoftwarePanel from "./components/SoftwarePanel";
import ValidationPanel from "./components/ValidationPanel";
import StatCards from "./components/StatCards";
import { ArtifactsCard, DiagnosticsCard, ActivityLogCard } from "./components/RightRail";
import SettingsPage from "./components/SettingsPage";
import { healthCheck } from "./lib/api";

export default function App() {
  const [view, setView] = useState("dashboard");
  const [apiOnline, setApiOnline] = useState(null);
  const [artifacts, setArtifacts] = useState([]);
  const [log, setLog] = useState([]);
  const [lastHardware, setLastHardware] = useState(null);
  const [lastSoftwareHtml, setLastSoftwareHtml] = useState("");

  useEffect(() => {
    let mounted = true;
    const check = () => healthCheck().then((ok) => mounted && setApiOnline(ok)).catch(() => mounted && setApiOnline(false));
    check();
    const t = setInterval(check, 15000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const pushLog = useCallback((text, level = "INFO") => {
    setLog((l) => [...l, { time: new Date().toLocaleTimeString(), text, level }]);
  }, []);

  const pushArtifact = useCallback((a) => {
    setArtifacts((prev) => [...prev, { ...a, time: new Date().toLocaleTimeString() }]);
  }, []);

  const errorCount = log.filter((l) => l.level === "ERROR").length;
  const hasResults = !!lastHardware || !!lastSoftwareHtml;

  return (
    <div className="app-shell">
      <Sidebar active={view} onNavigate={setView} />
      <div>
        <Header apiOnline={!!apiOnline} notifCount={errorCount} onOpenActivity={() => setView("activity")} />
        <div className="content">
          {apiOnline === false && (
            <div className="status-line error">
              Backend unreachable at the configured API URL. Start the FastAPI server
              (see backend/README.md) or set VITE_API_BASE_URL, then reload.
            </div>
          )}

          {view === "dashboard" && (
            <>
              <StatCards artifacts={artifacts} checksTotal={hasResults ? 6 : 0} checksPassed={0} errors={errorCount} />
              <div className="content-grid">
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div className="two-col">
                    <HardwarePanel onArtifact={pushArtifact} onLog={pushLog} apiOnline={!!apiOnline} onResult={setLastHardware} />
                    <SoftwarePanel onArtifact={pushArtifact} onLog={pushLog} apiOnline={!!apiOnline} onResult={setLastSoftwareHtml} />
                  </div>
                  <ValidationPanel hardware={lastHardware} softwareHtml={lastSoftwareHtml} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <ArtifactsCard artifacts={artifacts} />
                  <DiagnosticsCard apiOnline={!!apiOnline} />
                  <ActivityLogCard log={log} />
                </div>
              </div>
            </>
          )}

          {view === "hardware" && (
            <div style={{ maxWidth: 900 }}>
              <HardwarePanel onArtifact={pushArtifact} onLog={pushLog} apiOnline={!!apiOnline} onResult={setLastHardware} />
            </div>
          )}

          {view === "software" && (
            <div style={{ maxWidth: 900 }}>
              <SoftwarePanel onArtifact={pushArtifact} onLog={pushLog} apiOnline={!!apiOnline} onResult={setLastSoftwareHtml} />
            </div>
          )}

          {view === "artifacts" && <ArtifactsCard artifacts={artifacts} />}
          {view === "activity" && <ActivityLogCard log={log} />}
          {view === "settings" && <SettingsPage onLog={pushLog} />}
        </div>
      </div>
    </div>
  );
}
