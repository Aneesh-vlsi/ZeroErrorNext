# ZeroError Silicon — Next

A rebuild of ZeroError Silicon as a real React + FastAPI app (out of Gradio),
with genuine one-click browser-based flashing for supported boards.

```
zeroerror-next/
├── backend/     FastAPI — Gemini generation + server-side compilation
└── frontend/    React (Vite) — dashboard UI, WebSerial/WebUSB flashing
```

## Quick start

**Backend:**
```bash
cd backend
pip install -r requirements.txt
export GEMINI_API_KEY="your-key"
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
cp .env.example .env      # points at http://localhost:8000 by default
npm install
npm run dev
```

Open the printed localhost URL in **Chrome or Edge** (WebSerial/WebUSB are
Chromium-only — flashing buttons will detect and warn if unsupported).

## What's real vs. what needs your own toolchain

| Board                  | AI firmware generation | One-click flash |
|-------------------------|:-----------------------:|:----------------:|
| ESP8266                | ✅                       | ✅ via WebSerial (esptool-js) |
| STM32H743ZI2 (Nucleo)  | ✅                       | ✅ via WebUSB DFU — put board in DFU mode first (BOOT0 high, reset) |
| Any other MCU you type in | ✅ (AI still writes the firmware) | ❌ — download the source, compile/flash with your board's normal toolchain |

Compilation for the two supported boards happens server-side (arduino-cli /
PlatformIO, see `backend/Dockerfile`) — only flashing happens in the browser.

## What I haven't been able to verify

I don't have physical ESP8266 or STM32H743ZI2 hardware in this environment,
so:
- The ESP8266 path uses `esptool-js`, the same library behind Espressif's
  official web flasher — high confidence it works as written.
- The STM32H7 path is a from-scratch WebUSB implementation of the DfuSe
  protocol (mass-erase → set-address → chunked write → manifest). It follows
  the spec dfu-util/STM32CubeProgrammer use, but **please test it on real
  hardware before relying on it** — USB DFU implementations are exactly the
  kind of thing that looks right on paper and needs a real device to confirm.

## Deploying for free

- **Frontend** → Vercel or Netlify free tier (static Vite build).
- **Backend** → Render free tier using `backend/Dockerfile` (see
  `backend/README.md` for the exact steps).
