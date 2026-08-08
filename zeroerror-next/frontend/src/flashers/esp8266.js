// esp8266.js
// Real WebSerial flashing for ESP8266 using esptool-js — the same engine
// behind Espressif's official web-based flasher. No local software needed,
// only a Chromium-based browser (Chrome/Edge) with WebSerial support.
import { ESPLoader, Transport } from "esptool-js";

export function isWebSerialSupported() {
  return "serial" in navigator;
}

/**
 * Flash a compiled .bin to an ESP8266 over WebSerial.
 * @param {Uint8Array} binaryData - the compiled firmware binary
 * @param {(msg: string) => void} onLog - progress/log callback
 * @param {(pct: number) => void} onProgress - 0-100 progress callback
 */
export async function flashEsp8266(binaryData, onLog = () => {}, onProgress = () => {}) {
  if (!isWebSerialSupported()) {
    throw new Error(
      "WebSerial isn't supported in this browser. Use Chrome or Edge (desktop) to flash directly."
    );
  }

  const device = await navigator.serial.requestPort({});
  const transport = new Transport(device, true);

  const loaderTerminal = {
    clean() {},
    writeLine: (data) => onLog(data),
    write: (data) => onLog(data),
  };

  const loader = new ESPLoader({
    transport,
    baudrate: 115200,
    terminal: loaderTerminal,
  });

  onLog("Connecting to chip...");
  await loader.main();
  onLog(`Connected: ${loader.chip?.CHIP_NAME || "ESP8266"}`);

  // Binary strings are converted to a binary "string" internally by
  // esptool-js in some builds; this version's API takes Uint8Array directly.
  await loader.writeFlash({
    fileArray: [{ data: binaryData, address: 0x0 }],
    flashSize: "keep",
    flashMode: "keep",
    flashFreq: "keep",
    eraseAll: false,
    compress: true,
    reportProgress: (fileIndex, written, total) => {
      onProgress(Math.round((written / total) * 100));
    },
  });

  onLog("Flash complete. Resetting device...");
  await transport.setDTR(false);
  await new Promise((r) => setTimeout(r, 100));
  await transport.setDTR(true);
  await transport.disconnect();
  onLog("Done — device should now be running the new firmware.");
}
