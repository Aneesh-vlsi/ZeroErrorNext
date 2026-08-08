import { useState } from "react";
import { Cpu, Zap, Download, Loader2 } from "lucide-react";
import { generateHardware, compileHardware, base64ToBytes } from "../lib/api";
import { flashEsp8266, isWebSerialSupported } from "../flashers/esp8266";
import { flashStm32h7, isWebUSBSupported } from "../flashers/stm32h7";

const BOARD_OPTIONS = [
  { value: "ESP8266 NodeMCU", family: "esp8266", label: "ESP8266 (NodeMCU / Wemos D1)" },
  { value: "STM32 H743ZI2 Nucleo", family: "stm32h7", label: "STM32H743ZI2 (Nucleo-H743ZI2)" },
  { value: "__custom__", family: "other", label: "Other / Custom (type board name)" },
];

export default function HardwarePanel({ onArtifact, onLog, apiOnline, onResult }) {
  const [boardChoice, setBoardChoice] = useState(BOARD_OPTIONS[0].value);
  const [customBoard, setCustomBoard] = useState("");
  const [components, setComponents] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // {code, wiring, family, error}
  const [status, setStatus] = useState(null);
  const [flashState, setFlashState] = useState({ busy: false, log: [], progress: 0 });

  const selectedFamily = BOARD_OPTIONS.find((b) => b.value === boardChoice)?.family;
  const effectiveBoardName = boardChoice === "__custom__" ? customBoard : boardChoice;
  const canFlash = selectedFamily === "esp8266" || selectedFamily === "stm32h7";

  async function handleGenerate() {
    if (!effectiveBoardName.trim() || !components.trim()) {
      setStatus({ type: "error", text: "Board and peripheral requirements can't be empty." });
      return;
    }
    setBusy(true);
    setStatus(null);
    setResult(null);
    onLog(`Requested firmware generation for "${effectiveBoardName}".`);
    try {
      const res = await generateHardware(effectiveBoardName, components);
      if (res.error) {
        setStatus({ type: "error", text: res.error });
        onLog(`Hardware generation failed: ${res.error}`, "ERROR");
      } else {
        setResult(res);
        onResult && onResult(res);
        setStatus({ type: "success", text: `Firmware generated using ${res.key_used}.` });
        onArtifact({
          name: `${effectiveBoardName.replace(/\s+/g, "_")}_firmware.c`,
          kind: "C Source",
          content: res.code,
        });
        onLog(`Firmware generated for ${effectiveBoardName} (${res.family}).`);
      }
    } catch (e) {
      setStatus({ type: "error", text: `Request failed: ${e.message}. Is the backend running?` });
      onLog(`Hardware generation request error: ${e.message}`, "ERROR");
    } finally {
      setBusy(false);
    }
  }

  function handleDownload() {
    if (!result?.code) return;
    const blob = new Blob([result.code], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${effectiveBoardName.replace(/\s+/g, "_")}_firmware.c`;
    a.click();
  }

  async function handleCompileAndFlash() {
    if (!result?.code) return;
    setFlashState({ busy: true, log: ["Compiling on server..."], progress: 0 });
    try {
      const compileRes = await compileHardware(selectedFamily, result.code);
      if (compileRes.error) {
        setFlashState((s) => ({ ...s, busy: false, log: [...s.log, `Compile failed: ${compileRes.error}`] }));
        onLog(`Compile failed for ${selectedFamily}: ${compileRes.error}`, "ERROR");
        return;
      }
      const binBytes = base64ToBytes(compileRes.binary_b64);
      setFlashState((s) => ({ ...s, log: [...s.log, `Compiled ${binBytes.length} bytes. Connecting to device...`] }));
      onLog(`Compiled firmware for ${effectiveBoardName} (${binBytes.length} bytes).`);

      const onFlashLog = (msg) => setFlashState((s) => ({ ...s, log: [...s.log, msg] }));
      const onFlashProgress = (pct) => setFlashState((s) => ({ ...s, progress: pct }));

      if (selectedFamily === "esp8266") {
        if (!isWebSerialSupported()) throw new Error("WebSerial not supported — use Chrome/Edge desktop.");
        await flashEsp8266(binBytes, onFlashLog, onFlashProgress);
      } else if (selectedFamily === "stm32h7") {
        if (!isWebUSBSupported()) throw new Error("WebUSB not supported — use Chrome/Edge desktop.");
        await flashStm32h7(binBytes, onFlashLog, onFlashProgress);
      }
      setFlashState((s) => ({ ...s, busy: false }));
      onLog(`Flashed firmware directly to ${effectiveBoardName}.`, "SUCCESS");
    } catch (e) {
      setFlashState((s) => ({ ...s, busy: false, log: [...s.log, `Error: ${e.message}`] }));
      onLog(`Flash failed: ${e.message}`, "ERROR");
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <Cpu size={17} className="icon" />
        <h2>HARDWARE ENGINEERING</h2>
      </div>

      <div className="field">
        <label className="field-label">Target Microcontroller Board</label>
        <select value={boardChoice} onChange={(e) => setBoardChoice(e.target.value)}>
          {BOARD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {boardChoice === "__custom__" && (
        <div className="field">
          <label className="field-label">Board Name</label>
          <input
            value={customBoard}
            onChange={(e) => setCustomBoard(e.target.value)}
            placeholder="e.g., Arduino Uno, STM32 Blue Pill, Raspberry Pi Pico"
          />
        </div>
      )}

      <div className="field">
        <label className="field-label">Sensors, Pins &amp; Peripherals Requirements</label>
        <textarea
          value={components}
          onChange={(e) => setComponents(e.target.value)}
          placeholder="e.g., sense distance via ultrasonic sensor and show on OLED screen"
        />
      </div>

      <button className="btn btn-primary-orange" onClick={handleGenerate} disabled={busy || !apiOnline}>
        {busy ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
        {busy ? "GENERATING..." : "GENERATE HARDWARE"}
      </button>

      {status && (
        <div className={`status-line ${status.type}`}>{status.text}</div>
      )}

      {result?.code && (
        <>
          <div className="section-title">Verified Source Code</div>
          <pre className="code-block">{result.code}</pre>

          {result.wiring && (
            <>
              <div className="section-title">Wiring / Pin Connections</div>
              <pre className="code-block">{result.wiring}</pre>
            </>
          )}

          <div className="btn-row">
            <button className="btn btn-secondary" onClick={handleDownload}>
              <Download size={15} /> Download
            </button>
            {canFlash && (
              <button className="btn btn-green" onClick={handleCompileAndFlash} disabled={flashState.busy}>
                {flashState.busy ? <Loader2 size={15} className="spin" /> : <Zap size={15} />}
                {flashState.busy ? "FLASHING..." : "COMPILE & FLASH TO BOARD"}
              </button>
            )}
          </div>

          {!canFlash && result.family === "other-hardware" && (
            <div className="status-line">
              One-click flashing isn't wired up for this board yet (only ESP8266 and
              STM32H743ZI2 are supported right now). Download the source and compile/flash
              it with your board's usual toolchain.
            </div>
          )}

          {flashState.log.length > 0 && (
            <>
              {flashState.busy && (
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${flashState.progress}%` }} /></div>
              )}
              <pre className="code-block" style={{ marginTop: 10 }}>{flashState.log.join("\n")}</pre>
            </>
          )}
        </>
      )}
    </div>
  );
}
