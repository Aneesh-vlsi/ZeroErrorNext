FROM python:3.11-slim

# =========================================================
# System dependencies
# =========================================================

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    build-essential \
    tar \
    && rm -rf /var/lib/apt/lists/*


# =========================================================
# Arduino CLI
# Used to compile ESP8266 sketches
# =========================================================

ARG ARDUINO_CLI_VERSION=1.5.1

RUN curl -fsSL \
    "https://downloads.arduino.cc/arduino-cli/arduino-cli_${ARDUINO_CLI_VERSION}_Linux_64bit.tar.gz" \
    -o /tmp/arduino-cli.tar.gz \
    && tar -xzf /tmp/arduino-cli.tar.gz -C /tmp \
    && install -m 0755 /tmp/arduino-cli /usr/local/bin/arduino-cli \
    && rm -f /tmp/arduino-cli.tar.gz /tmp/arduino-cli

# Verify Arduino CLI installation
RUN arduino-cli version

# Initialize Arduino CLI
RUN arduino-cli config init

# Install ESP8266 board package
RUN arduino-cli core update-index \
    --additional-urls https://arduino.esp8266.com/stable/package_esp8266com_index.json \
    && arduino-cli core install esp8266:esp8266 \
    --additional-urls https://arduino.esp8266.com/stable/package_esp8266com_index.json


# =========================================================
# Application
# =========================================================

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt


# =========================================================
# PlatformIO
# Used to compile STM32H743ZI2 firmware
# =========================================================

RUN pip install --no-cache-dir platformio \
    && pio pkg install --global --platform ststm32


# =========================================================
# Copy backend source
# =========================================================

COPY . .


# =========================================================
# Render configuration
# =========================================================

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
