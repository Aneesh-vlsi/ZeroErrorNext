FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates git build-essential \
    && rm -rf /var/lib/apt/lists/*

# arduino-cli — used to compile the ESP8266 sketch
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh -s -- -b /usr/local/bin
RUN arduino-cli config init && \
    arduino-cli core update-index --additional-urls https://arduino.esp8266.com/stable/package_esp8266com_index.json && \
    arduino-cli core install esp8266:esp8266 --additional-urls https://arduino.esp8266.com/stable/package_esp8266com_index.json

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# PlatformIO — used to compile the STM32H743ZI2 build
RUN pip install --no-cache-dir platformio && \
    pio pkg install --global --platform ststm32

COPY . .

ENV PORT=8000
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
