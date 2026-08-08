# ZeroError Silicon — Backend (FastAPI)

## Local dev

```bash
cd backend
pip install -r requirements.txt
export GEMINI_API_KEY="your-key-here"     # or GEMINI_KEY_1..GEMINI_KEY_10 for a pool
uvicorn main:app --reload --port 8000
```

Check it's alive: `curl http://localhost:8000/api/health`

Software generation and firmware-generation-without-flashing work with just
the steps above — no extra toolchains needed.

## Enabling real compile + flash

`/api/hardware/compile` needs real toolchains installed on the server:

- **ESP8266** → [arduino-cli](https://arduino.github.io/arduino-cli/) with the
  `esp8266:esp8266` core installed.
- **STM32H743ZI2** → [PlatformIO](https://platformio.org/) (`pip install platformio`)
  with the `ststm32` platform installed.

The provided `Dockerfile` installs both. This is the same install script the
original Gradio app's `arduino-cli` pipeline needed, just run once at image
build time instead of per-request — it's what caused the subprocess hang
before, since it tried to lazily install cores on first use.

## Deploying on Render (free tier)

1. New "Web Service" → connect this repo, root directory `backend/`.
2. Environment: **Docker** (uses `backend/Dockerfile`).
3. Add environment variable `GEMINI_API_KEY` (get a free one at
   https://aistudio.google.com/apikey — no billing required for the free tier).
4. Deploy. Render's free tier is enough for this — no GPU/heavy compute needed,
   arduino-cli/PlatformIO compiles are lightweight (single small sketch files).

Note: Render's free web services spin down after inactivity and take ~30-60s
to wake back up on the first request — that's a Render limitation, not this
app's.

## Endpoints

| Method | Path                     | Purpose                                  |
|--------|--------------------------|-------------------------------------------|
| GET    | `/api/health`            | Liveness check                            |
| GET    | `/api/boards`            | Supported board registry                  |
| POST   | `/api/hardware/generate` | `{board, components}` → firmware + wiring |
| POST   | `/api/software/generate` | `{prompt}` → self-contained HTML app      |
| POST   | `/api/hardware/compile`  | `{family, code}` → base64 binary to flash |

All generation endpoints accept an optional `X-Gemini-Key` header — if the
user pasted their own key in Settings on the frontend, it's sent per-request
and used instead of the server's key pool.
