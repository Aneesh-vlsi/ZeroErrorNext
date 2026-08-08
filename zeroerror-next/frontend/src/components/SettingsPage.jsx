import { useState } from "react";
import { Settings as SettingsIcon, Save } from "lucide-react";

export default function SettingsPage({ onLog }) {
  const [key, setKey] = useState(localStorage.getItem("zes_gemini_key") || "");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (key.trim()) {
      localStorage.setItem("zes_gemini_key", key.trim());
    } else {
      localStorage.removeItem("zes_gemini_key");
    }
    setSaved(true);
    onLog("Settings updated: Gemini API key " + (key.trim() ? "saved to this browser." : "cleared."));
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="panel" style={{ maxWidth: 520 }}>
      <div className="panel-header">
        <SettingsIcon size={17} className="icon" />
        <h2>SETTINGS</h2>
      </div>

      <div className="field">
        <label className="field-label">Your Gemini API Key (optional)</label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste your own free-tier Gemini API key..."
        />
        <div className="empty-note" style={{ paddingTop: 8 }}>
          Stored only in this browser's localStorage and sent as a request header —
          never written anywhere server-side. Leave blank to use the server's shared
          key pool, if configured. Get a free key at{" "}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: "var(--accent-blue)" }}>
            aistudio.google.com/apikey
          </a>.
        </div>
      </div>

      <button className="btn btn-primary-orange" onClick={handleSave}>
        <Save size={15} /> {saved ? "SAVED" : "SAVE SETTINGS"}
      </button>
    </div>
  );
}
