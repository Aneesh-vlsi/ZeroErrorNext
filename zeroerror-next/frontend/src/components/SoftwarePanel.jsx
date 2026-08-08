import { useState } from "react";
import { Code2, Download, Loader2 } from "lucide-react";
import { generateSoftware } from "../lib/api";

export default function SoftwarePanel({ onArtifact, onLog, apiOnline, onResult }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [html, setHtml] = useState("");
  const [status, setStatus] = useState(null);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setStatus({ type: "error", text: "Describe the app you want generated first." });
      return;
    }
    setBusy(true);
    setStatus(null);
    setHtml("");
    onLog(`Requested software generation: "${prompt.slice(0, 60)}${prompt.length > 60 ? "..." : ""}"`);
    try {
      const res = await generateSoftware(prompt);
      if (res.error) {
        setStatus({ type: "error", text: res.error });
        onLog(`Software generation failed: ${res.error}`, "ERROR");
      } else {
        setHtml(res.html);
        onResult && onResult(res.html);
        setStatus({ type: "success", text: `Application generated using ${res.key_used}.` });
        onArtifact({ name: "generated_app.html", kind: "HTML5 App", content: res.html });
        onLog("Software app generated successfully.");
      }
    } catch (e) {
      setStatus({ type: "error", text: `Request failed: ${e.message}. Is the backend running?` });
      onLog(`Software generation request error: ${e.message}`, "ERROR");
    } finally {
      setBusy(false);
    }
  }

  function handleDownload() {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "generated_app.html";
    a.click();
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <Code2 size={17} className="icon" />
        <h2>SOFTWARE ENGINEERING</h2>
      </div>

      <div className="field">
        <label className="field-label">Application / Description</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., a live camera object-detection app with bounding boxes"
        />
      </div>

      <div className="field">
        <label className="field-label">Language / Framework</label>
        <select value="html5" disabled>
          <option value="html5">HTML5 / CSS / JavaScript (self-contained)</option>
        </select>
      </div>

      <button className="btn btn-primary-blue" onClick={handleGenerate} disabled={busy || !apiOnline}>
        {busy ? <Loader2 size={16} className="spin" /> : <Code2 size={16} />}
        {busy ? "GENERATING..." : "GENERATE SOFTWARE"}
      </button>

      {status && <div className={`status-line ${status.type}`}>{status.text}</div>}

      {html && (
        <>
          <div className="section-title">Live Preview</div>
          <iframe title="preview" className="iframe-preview" sandbox="allow-scripts allow-same-origin allow-forms" srcDoc={html} />
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={handleDownload}>
              <Download size={15} /> Download HTML
            </button>
          </div>
        </>
      )}
    </div>
  );
}
