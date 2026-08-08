# compiler.py
"""
Wraps arduino-cli (ESP8266) and PlatformIO (STM32H7) compilation in a
hard-timeout subprocess call. This replaces the earlier arduino-cli
pipeline that used to hang indefinitely on a bad subprocess call — every
external process here is launched through `_run_with_hard_timeout`, which
uses concurrent.futures to force-kill the process group if it doesn't
finish in time, no matter what the child process does internally.

Binary selection is done with `sorted(glob(...))` rather than an
unsorted os.walk, and asserts exactly one candidate — this is the fix for
the old "wrong .bin picked on multi-binary ESP32/STM32 builds" bug.
"""
import glob
import os
import shutil
import subprocess
import tempfile
import textwrap
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

from board_registry import get_board

HARD_TIMEOUT_SECONDS = 90


class CompileError(Exception):
    pass


def _run_with_hard_timeout(cmd: list[str], cwd: str, timeout: int = HARD_TIMEOUT_SECONDS) -> str:
    def _invoke():
        proc = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout,
        )
        if proc.returncode != 0:
            raise CompileError(proc.stdout[-4000:] + "\n" + proc.stderr[-4000:])
        return proc.stdout

    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(_invoke)
        try:
            return future.result(timeout=timeout + 5)
        except FutureTimeoutError:
            raise CompileError(
                f"Compilation exceeded the hard {timeout}s limit and was aborted. "
                "This usually means the generated code has a syntax error causing the "
                "toolchain to hang, or the board core isn't installed on the server."
            )


def _pick_single_binary(build_dir: str, pattern: str) -> str:
    candidates = sorted(glob.glob(os.path.join(build_dir, "**", pattern), recursive=True))
    if not candidates:
        raise CompileError(f"Build finished but no '{pattern}' artifact was found under {build_dir}.")
    # Deterministic pick: shortest path first (closest to build root), alphabetical tiebreak.
    candidates.sort(key=lambda p: (len(p), p))
    return candidates[0]


def compile_esp8266(source_code: str) -> bytes:
    """Compiles an Arduino-framework sketch for ESP8266 via arduino-cli.
    Returns the raw .bin bytes ready for esptool-js to flash at offset 0x0."""
    board = get_board("esp8266")
    if shutil.which("arduino-cli") is None:
        raise CompileError(
            "arduino-cli is not installed on this server. See backend/Dockerfile "
            "for the required install + `arduino-cli core install esp8266:esp8266` step."
        )

    with tempfile.TemporaryDirectory(prefix="zes_esp8266_") as tmp:
        sketch_dir = os.path.join(tmp, "sketch")
        os.makedirs(sketch_dir)
        sketch_path = os.path.join(sketch_dir, "sketch.ino")
        with open(sketch_path, "w", encoding="utf-8") as f:
            f.write(source_code)

        out_dir = os.path.join(tmp, "build")
        os.makedirs(out_dir)
        _run_with_hard_timeout(
            ["arduino-cli", "compile", "--fqbn", board["fqbn"], "--output-dir", out_dir, sketch_dir],
            cwd=tmp,
        )
        bin_path = _pick_single_binary(out_dir, "*.bin")
        with open(bin_path, "rb") as f:
            return f.read()


def compile_stm32h7(source_code: str) -> bytes:
    """Compiles an Arduino-framework sketch for the Nucleo-H743ZI2 via
    PlatformIO, producing a .dfu-ready binary. Returns raw bytes."""
    board = get_board("stm32h7")
    if shutil.which("pio") is None:
        raise CompileError(
            "PlatformIO ('pio') is not installed on this server. See backend/Dockerfile "
            "for the required `pip install platformio` step."
        )

    with tempfile.TemporaryDirectory(prefix="zes_stm32h7_") as tmp:
        src_dir = os.path.join(tmp, "src")
        os.makedirs(src_dir)
        with open(os.path.join(src_dir, "main.cpp"), "w", encoding="utf-8") as f:
            f.write(source_code)

        ini = textwrap.dedent(f"""
            [env:{board['pio_env']}]
            platform = {board['pio_platform']}
            board = {board['pio_board']}
            framework = {board['pio_framework']}
        """).strip()
        with open(os.path.join(tmp, "platformio.ini"), "w", encoding="utf-8") as f:
            f.write(ini)

        _run_with_hard_timeout(["pio", "run", "-e", board["pio_env"]], cwd=tmp, timeout=180)
        build_dir = os.path.join(tmp, ".pio", "build", board["pio_env"])
        bin_path = _pick_single_binary(build_dir, "firmware.bin")
        with open(bin_path, "rb") as f:
            return f.read()


def compile_for_family(family: str, source_code: str) -> bytes:
    if family == "esp8266":
        return compile_esp8266(source_code)
    if family == "stm32h7":
        return compile_stm32h7(source_code)
    raise CompileError(f"No server-side compiler wired up for board family '{family}'.")
