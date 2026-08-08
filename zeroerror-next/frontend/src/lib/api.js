const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function authHeaders() {
  const key = localStorage.getItem("zes_gemini_key") || "";
  return key ? { "X-Gemini-Key": key } : {};
}

async function postJSON(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function generateHardware(board, components) {
  return postJSON("/api/hardware/generate", { board, components });
}

export async function generateSoftware(prompt) {
  return postJSON("/api/software/generate", { prompt });
}

export async function compileHardware(family, code) {
  return postJSON("/api/hardware/compile", { family, code });
}

export async function getBoards() {
  const res = await fetch(`${BASE_URL}/api/boards`);
  if (!res.ok) throw new Error("Failed to load board registry");
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${BASE_URL}/api/health`);
  return res.ok;
}

export function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
