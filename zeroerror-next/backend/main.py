# main.py
import base64
import time

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import ai_engine
from board_registry import BOARDS
from compiler import CompileError, compile_for_family

app = FastAPI(title="ZeroError Silicon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your deployed frontend origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "operational", "time": time.time()}


@app.get("/api/boards")
def boards():
    return {"boards": BOARDS}


class HardwareGenRequest(BaseModel):
    board: str
    components: str


@app.post("/api/hardware/generate")
def hardware_generate(req: HardwareGenRequest, x_gemini_key: str = Header(default="")):
    result = ai_engine.generate_hardware(req.board, req.components, x_gemini_key)
    return result


class SoftwareGenRequest(BaseModel):
    prompt: str


@app.post("/api/software/generate")
def software_generate(req: SoftwareGenRequest, x_gemini_key: str = Header(default="")):
    result = ai_engine.generate_software(req.prompt, x_gemini_key)
    return result


class CompileRequest(BaseModel):
    family: str
    code: str


@app.post("/api/hardware/compile")
def hardware_compile(req: CompileRequest):
    try:
        binary = compile_for_family(req.family, req.code)
    except CompileError as e:
        return {"error": str(e), "binary_b64": None}
    board = BOARDS.get(req.family, {})
    return {
        "error": None,
        "binary_b64": base64.b64encode(binary).decode("ascii"),
        "flash_protocol": board.get("flash_protocol"),
        "flash_offset": board.get("flash_offset"),
        "default_baud": board.get("default_baud"),
    }


if __name__ == "__main__":
    import os
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
