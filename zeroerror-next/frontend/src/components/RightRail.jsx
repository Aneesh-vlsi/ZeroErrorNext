import { FileCode, FileText, Boxes, Activity, CheckCircle2 } from "lucide-react";

const ICONS = { "C Source": FileCode, "HTML5 App": FileText };

export function ArtifactsCard({ artifacts }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <Boxes size={17} className="icon" />
        <h2>AI GENERATED ARTIFACTS</h2>
      </div>
      {artifacts.length === 0 && <div className="empty-note">Nothing generated yet this session.</div>}
      {artifacts.slice().reverse().map((a, i) => {
        const Icon = ICONS[a.kind] || FileText;
        return (
          <div className="artifact-row" key={i}>
            <div className="artifact-icon"><Icon size={15} /></div>
            <div>
              <div className="artifact-name">{a.name}</div>
              <div className="artifact-meta">{a.kind} · {a.time}</div>
              <div className="artifact-status"><CheckCircle2 size={11} /> Generated</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DiagnosticsCard({ apiOnline }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <Activity size={17} className="icon" />
        <h2>SYSTEM DIAGNOSTICS</h2>
      </div>
      <div className="check-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="check-item">Backend API
          <span className={`check-status ${apiOnline ? "pass" : "fail"}`}>
            <span className={`dot ${apiOnline ? "" : "off"}`} /> {apiOnline ? "Operational" : "Unreachable"}
          </span>
        </div>
        <div className="check-item">WebSerial (ESP8266)
          <span className={`check-status ${("serial" in navigator) ? "pass" : "fail"}`}>
            <span className={`dot ${("serial" in navigator) ? "" : "off"}`} /> {("serial" in navigator) ? "Supported" : "Unsupported"}
          </span>
        </div>
        <div className="check-item">WebUSB (STM32H7)
          <span className={`check-status ${("usb" in navigator) ? "pass" : "fail"}`}>
            <span className={`dot ${("usb" in navigator) ? "" : "off"}`} /> {("usb" in navigator) ? "Supported" : "Unsupported"}
          </span>
        </div>
        <div className="check-item">Gemini Key
          <span className={`check-status ${localStorage.getItem("zes_gemini_key") ? "pass" : "pending"}`}>
            <span className="dot" /> {localStorage.getItem("zes_gemini_key") ? "Configured (client)" : "Using server pool"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ActivityLogCard({ log }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <Activity size={17} className="icon" />
        <h2>ACTIVITY LOG</h2>
      </div>
      {log.length === 0 && <div className="empty-note">No activity yet.</div>}
      {log.slice().reverse().slice(0, 20).map((entry, i) => (
        <div className="log-row" key={i}>
          <span className="log-time">{entry.time}</span>
          <span>
            <span className="log-tag">[{entry.level}]</span>
            {entry.text}
          </span>
        </div>
      ))}
    </div>
  );
}
