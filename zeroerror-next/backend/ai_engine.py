# ai_engine.py
"""
Gemini generation layer.

Ported from the original ZeroError Silicon (Gradio) app's config.py /
ai_engine.py, with one real fix: the old code targeted a model name
('gemini-3.5-flash') that does not exist, which is why generation calls
were silently falling through to the 'QUOTA_ERROR' / crash branches.
This uses a real fallback chain of current models instead. The prompt
content and behavior (multi-key rotation, manual override key, board
validation rules, software-generation system instruction) are kept
as-is so output quality/behavior matches the original app.
"""
import os
import random
import re
from google import genai
from google.genai import types

# Ordered fallback chain — first that succeeds wins.
MODEL_FALLBACK_CHAIN = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]

API_KEY_POOL = [v for v in [
    os.environ.get(f"GEMINI_KEY_{i}", "") for i in range(1, 11)
] if v.strip()]
if os.environ.get("GEMINI_API_KEY", "").strip():
    API_KEY_POOL.insert(0, os.environ["GEMINI_API_KEY"].strip())


def safe_api_call(contents: str, system_instruction: str, manual_override_key: str = ""):
    """Tries the manual override key first (if provided), else rotates
    through the server-side key pool. Within each key, walks the model
    fallback chain. Returns (text, key_label)."""
    clean_override = str(manual_override_key or "").strip()

    def _try_key(api_key: str, label: str):
        try:
            client = genai.Client(api_key=api_key)
        except Exception as e:
            return None, f"{label} init failed: {e}"
        for model_name in MODEL_FALLBACK_CHAIN:
            try:
                resp = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        temperature=0.4,
                        system_instruction=system_instruction,
                    ),
                )
                if resp and resp.text:
                    return resp.text, label
            except Exception:
                continue
        return None, None

    if clean_override and len(clean_override) > 10:
        text, _ = _try_key(clean_override, "Manual Override Key")
        if text:
            return text, "Manual Override Key"
        return "QUOTA_ERROR: manual override key failed on every model in the fallback chain.", "Manual Override Failed"

    pool = list(API_KEY_POOL)
    random.shuffle(pool)
    if not pool:
        return "QUOTA_ERROR: No GEMINI_API_KEY / GEMINI_KEY_n configured on the server.", "Keys Missing"

    for key in pool:
        text, _ = _try_key(key, "System Rotated Key")
        if text:
            return text, "System Rotated Key"

    return "QUOTA_ERROR: All configured API keys were exhausted or failed.", "All Keys Exhausted"


RESTRICTED_SOFTWARE_TERMS = [
    "server", "client", "website", "webpage", "database", "api", "cloud",
    "application", "app", "ui", "ux", "my computer", "pc", "laptop",
]
VALID_HARDWARE_KEYWORDS = [
    "stm32", "esp32", "esp8266", "arduino", "raspberry", "pico", "atmega",
    "pic16", "pic18", "msp430", "avr", "teensy", "nordic", "nrf52", "ch32",
]


def classify_board(board: str):
    """Returns 'esp8266', 'stm32h7', 'other-hardware', or 'invalid'."""
    clean = board.strip().lower()
    if any(term == clean for term in RESTRICTED_SOFTWARE_TERMS) or len(clean) < 3:
        return "invalid"
    if not any(hw in clean for hw in VALID_HARDWARE_KEYWORDS):
        return "invalid"
    if "esp8266" in clean:
        return "esp8266"
    if "stm32h7" in clean or "h743" in clean or "h750" in clean:
        return "stm32h7"
    return "other-hardware"


def generate_hardware(board: str, components: str, runtime_key: str = ""):
    family = classify_board(board)
    if family == "invalid":
        return {
            "error": f"'{board}' is not a recognized microcontroller/board target.",
            "code": "", "wiring": "", "family": family, "key_used": "No Key Used",
        }

    code_prompt = (
        f"Target MCU Board: {board}\nRequested Peripherals: {components}\n"
        "Write full operational C/C++ firmware code directly without markdown wrappers. "
        "If this is an Arduino-framework-compatible target, write it as a standard "
        "Arduino sketch with setup() and loop()."
    )
    code_instruction = (
        "You are an expert embedded firmware engineer. Output clean, complete, "
        "directly compilable C/C++ source code only — no markdown fences, no commentary."
    )
    raw_code, key_used = safe_api_call(code_prompt, code_instruction, runtime_key)
    if "QUOTA_ERROR" in raw_code:
        return {"error": raw_code, "code": "", "wiring": "", "family": family, "key_used": key_used}

    clean_code = raw_code.replace("```cpp", "").replace("```c", "").replace("```", "").strip()

    wiring_prompt = (
        f"Map out explicit pin connections between the board: '{board}' and components: "
        f"'{components}'. Format as a Markdown table with columns: "
        f"| {board} Pin | Header Pin Label | Target Device | Target Pin | Wire Color |"
    )
    wiring_instruction = "You are a hardware layout engineer. Output a markdown connection table only."
    raw_wiring, _ = safe_api_call(wiring_prompt, wiring_instruction, runtime_key)
    clean_wiring = raw_wiring.replace("```text", "").replace("```", "").strip()

    return {
        "error": None, "code": clean_code, "wiring": clean_wiring,
        "family": family, "key_used": key_used,
    }


# ============================================================
# Software generation — ported verbatim in behavior from the
# working Gradio app's config.py. Do not change the prompt logic.
# ============================================================
_SECURE_CONTEXT_GUARD_SNIPPET = """
<script>
(function() {
    function isInsecureContext() {
        var isLocalhost = ["localhost", "127.0.0.1", "[::1]"].indexOf(location.hostname) !== -1;
        return location.protocol !== "https:" && !isLocalhost;
    }
    function showGuardBanner(message) {
        if (document.getElementById("zes-secure-guard-banner")) return;
        var banner = document.createElement("div");
        banner.id = "zes-secure-guard-banner";
        banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:999999;background:#fef2f2;border-bottom:2px solid #fca5a5;color:#991b1b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;font-weight:600;padding:10px 14px;line-height:1.4;text-align:center;";
        banner.innerHTML = message;
        document.body.insertBefore(banner, document.body.firstChild);
    }
    if (isInsecureContext()) {
        window.__ZES_INSECURE_CONTEXT__ = true;
        document.addEventListener("DOMContentLoaded", function() {
            showGuardBanner("⚠️ Camera, microphone, and location features need a secure connection. Open this file via <code>http://localhost</code> or host it online with HTTPS (e.g. Netlify, GitHub Pages) &mdash; it will not work when opened directly as a local file, especially on mobile.");
        });
    }
})();
</script>
"""


def _inject_secure_context_guard(html_code: str) -> str:
    result = html_code
    if "viewport" not in result.lower():
        viewport_tag = '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        if re.search(r"<head[^>]*>", result, re.IGNORECASE):
            result = re.sub(r"(<head[^>]*>)", r"\1\n" + viewport_tag, result, count=1, flags=re.IGNORECASE)
        else:
            result = viewport_tag + result
    if re.search(r"<body[^>]*>", result, re.IGNORECASE):
        result = re.sub(r"(<body[^>]*>)", r"\1\n" + _SECURE_CONTEXT_GUARD_SNIPPET, result, count=1, flags=re.IGNORECASE)
    else:
        result = _SECURE_CONTEXT_GUARD_SNIPPET + result
    return result


def generate_software(prompt: str, runtime_key: str = ""):
    code_prompt = (
        f"Functional Asset Requirements: {prompt}\n\n"
        "Build this as a single, fully self-contained, REAL, WORKING HTML5 file "
        "(inline CSS and JavaScript only, no build tools, no server, no backend). "
        "It must be genuinely functional, not a mockup or static demo."
    )
    system_instruction = (
        "You are a master front-end software architect. Output ONLY a single complete "
        "HTML5 document (inline <style> and <script>) implementing the user's request as "
        "REAL, WORKING functionality — never a static mockup, placeholder, or fake animation "
        "pretending to be the real feature. Follow these rules precisely:\n\n"
        "1. MOBILE + DESKTOP COMPATIBLE: Always include "
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">, and use "
        "responsive layouts (flexbox/grid, relative units) that work on small phone screens "
        "and desktop windows alike. Buttons and tap targets must be large enough for touch.\n\n"
        "2. CAMERA / OBJECT DETECTION / COMPUTER VISION requests: use "
        "navigator.mediaDevices.getUserMedia({video:true}) to access the real camera into a "
        "<video> element. For AI object/image detection, load TensorFlow.js and the "
        "coco-ssd model from a public CDN, run real inference on the live video frames, and "
        "draw real bounding boxes/labels on a <canvas> overlay. Wrap camera access in "
        "try/catch and show a clear on-screen message if permission is denied or unavailable.\n\n"
        "3. LOCATION / MAPS requests: use navigator.geolocation.getCurrentPosition / "
        "watchPosition to get the user's real coordinates, and render a real interactive map "
        "using Leaflet.js + OpenStreetMap tiles loaded from CDN, centered on the user's real "
        "location with a marker. Since live traffic-flow data requires a paid provider key, "
        "include a labeled input field where the user can paste their own API key to enable a "
        "live traffic overlay, and clearly state in the UI when the app is showing "
        "'Demo/simulated traffic data' versus real data from a provided key.\n\n"
        "4. PERMISSIONS: Always wrap getUserMedia/geolocation calls in try/catch, and show a "
        "clear, visible on-page message explaining what went wrong and what the user can do.\n\n"
        "5. SELF-CONTAINED: Only reference external resources via public CDN <script>/<link> "
        "tags. No npm install, no build step, no server-side code.\n\n"
        "6. Output raw HTML only — no markdown code fences, no commentary before or after "
        "the document."
    )
    raw_software, key_used = safe_api_call(code_prompt, system_instruction, runtime_key)
    if "QUOTA_ERROR" in raw_software:
        return {"error": raw_software, "html": "", "key_used": key_used}

    clean_software = raw_software.replace("```html", "").replace("```css", "").replace("```javascript", "").replace("```", "").strip()
    clean_software = _inject_secure_context_guard(clean_software)
    return {"error": None, "html": clean_software, "key_used": key_used}
