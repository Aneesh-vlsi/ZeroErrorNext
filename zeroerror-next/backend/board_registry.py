# board_registry.py
"""
Metadata for the boards this build actually knows how to compile-for and
flash in-browser. Keep this list tight and honest — every entry here must
have a real, working flasher on the frontend (esptool-js for ESP8266,
stm32dfu/WebUSB for STM32H7). Anything not in this registry still gets AI
firmware generation, just not one-click flashing.
"""

BOARDS = {
    "esp8266": {
        "label": "ESP8266 (NodeMCU / Wemos D1 / Generic)",
        "toolchain": "arduino-cli",
        "fqbn": "esp8266:esp8266:nodemcuv2",
        "flash_protocol": "esptool-webserial",
        "flash_offset": 0x0,
        "default_baud": 115200,
        "usb_vendor_ids": [0x1A86, 0x10C4, 0x0403],  # CH340, CP210x, FTDI
    },
    "stm32h7": {
        "label": "STM32H743ZI2 (Nucleo-H743ZI2)",
        "toolchain": "platformio",
        "pio_env": "nucleo_h743zi",
        "pio_platform": "ststm32",
        "pio_board": "nucleo_h743zi",
        "pio_framework": "arduino",
        "flash_protocol": "dfu-webusb",
        "usb_vendor_id": 0x0483,  # STMicroelectronics
        "usb_product_id": 0xDF11,  # DFU bootloader PID
        "default_baud": None,
    },
}


def get_board(family: str):
    return BOARDS.get(family)
