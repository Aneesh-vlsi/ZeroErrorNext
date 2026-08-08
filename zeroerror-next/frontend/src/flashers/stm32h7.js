// stm32h7.js
// Real WebUSB flashing for STM32H743ZI2 using the ST "DfuSe" extension of
// USB DFU 1.1 — the same protocol dfu-util/STM32CubeProgrammer use. This
// talks to the chip's built-in ROM DFU bootloader directly; no local
// software required, only a Chromium-based browser with WebUSB support.
//
// Board must be put into DFU mode first (BOOT0 held high / jumper set,
// then reset) so it enumerates as USB VID 0x0483 PID 0xDF11.

const ST_VID = 0x0483;
const DFU_PID = 0xdf11;

const DFU_DETACH = 0x00;
const DFU_DNLOAD = 0x01;
const DFU_GETSTATUS = 0x03;
const DFU_CLRSTATUS = 0x04;
const DFU_ABORT = 0x06;

const STATE_dfuDNLOAD_IDLE = 5;
const STATE_dfuMANIFEST = 7;
const STATE_dfuERROR = 10;

const DFUSE_SET_ADDRESS = 0x21;
const DFUSE_ERASE = 0x41;

const TRANSFER_SIZE = 2048; // DfuSe default block size for STM32

export function isWebUSBSupported() {
  return "usb" in navigator;
}

async function claimDfuInterface(device) {
  await device.open();
  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }
  // Find the DFU interface (class 0xFE, subclass 0x01)
  const cfg = device.configuration;
  let ifaceNumber = null;
  for (const iface of cfg.interfaces) {
    const alt = iface.alternates[0];
    if (alt && alt.interfaceClass === 0xfe && alt.interfaceSubclass === 0x01) {
      ifaceNumber = iface.interfaceNumber;
      break;
    }
  }
  if (ifaceNumber === null) ifaceNumber = 0; // fallback
  await device.claimInterface(ifaceNumber);
  return ifaceNumber;
}

async function getStatus(device, ifaceNumber) {
  const result = await device.controlTransferIn(
    {
      requestType: "class",
      recipient: "interface",
      request: DFU_GETSTATUS,
      value: 0,
      index: ifaceNumber,
    },
    6
  );
  const data = new Uint8Array(result.data.buffer);
  return {
    status: data[0],
    pollTimeout: data[1] | (data[2] << 8) | (data[3] << 16),
    state: data[4],
  };
}

async function clearStatus(device, ifaceNumber) {
  await device.controlTransferOut({
    requestType: "class",
    recipient: "interface",
    request: DFU_CLRSTATUS,
    value: 0,
    index: ifaceNumber,
  });
}

async function waitWhileBusy(device, ifaceNumber) {
  for (let i = 0; i < 200; i++) {
    const st = await getStatus(device, ifaceNumber);
    if (st.state === STATE_dfuERROR) {
      throw new Error(`DFU device entered error state (status=${st.status}). Try re-plugging in DFU mode.`);
    }
    if (st.state !== 4 /* dfuDNBUSY */) return st;
    await new Promise((r) => setTimeout(r, Math.max(st.pollTimeout, 5)));
  }
  throw new Error("DFU device stayed busy too long — aborting.");
}

async function dfuseCommand(device, ifaceNumber, command, param = 0, extraBytes = new Uint8Array(0)) {
  let payload;
  if (command === DFUSE_ERASE && extraBytes.length === 0) {
    // Mass erase: single command byte only, no address.
    payload = new Uint8Array([DFUSE_ERASE]);
  } else if (command === DFUSE_ERASE) {
    payload = new Uint8Array(5);
    payload[0] = DFUSE_ERASE;
    new DataView(payload.buffer).setUint32(1, param, true);
  } else if (command === DFUSE_SET_ADDRESS) {
    payload = new Uint8Array(5);
    payload[0] = DFUSE_SET_ADDRESS;
    new DataView(payload.buffer).setUint32(1, param, true);
  } else {
    payload = extraBytes;
  }

  await device.controlTransferOut(
    {
      requestType: "class",
      recipient: "interface",
      request: DFU_DNLOAD,
      value: 0,
      index: ifaceNumber,
    },
    payload
  );
  const st = await waitWhileBusy(device, ifaceNumber);
  if (st.state === STATE_dfuERROR) {
    throw new Error("DfuSe command failed (device reported error state).");
  }
}

/**
 * Flash a raw firmware.bin to an STM32H743ZI2 over WebUSB DFU.
 * @param {Uint8Array} binaryData
 * @param {(msg: string) => void} onLog
 * @param {(pct: number) => void} onProgress
 */
export async function flashStm32h7(binaryData, onLog = () => {}, onProgress = () => {}) {
  if (!isWebUSBSupported()) {
    throw new Error("WebUSB isn't supported in this browser. Use Chrome or Edge (desktop).");
  }

  onLog("Requesting DFU device (put the board in DFU mode: BOOT0 high, then reset)...");
  const device = await navigator.usb.requestDevice({
    filters: [{ vendorId: ST_VID, productId: DFU_PID }],
  });

  const ifaceNumber = await claimDfuInterface(device);
  onLog(`Claimed DFU interface ${ifaceNumber} on ${device.productName || "STM32 device"}.`);

  await clearStatus(device, ifaceNumber);

  onLog("Mass-erasing flash (this can take up to ~20s on H7)...");
  await dfuseCommand(device, ifaceNumber, DFUSE_ERASE);

  const baseAddress = 0x08000000;
  onLog(`Setting address pointer to 0x${baseAddress.toString(16)}...`);
  await dfuseCommand(device, ifaceNumber, DFUSE_SET_ADDRESS, baseAddress);

  const total = binaryData.length;
  let written = 0;
  let blockNum = 2; // DfuSe reserves block 0/1 for commands; data starts at 2

  while (written < total) {
    const chunk = binaryData.slice(written, written + TRANSFER_SIZE);
    await device.controlTransferOut(
      {
        requestType: "class",
        recipient: "interface",
        request: DFU_DNLOAD,
        value: blockNum,
        index: ifaceNumber,
      },
      chunk
    );
    await waitWhileBusy(device, ifaceNumber);
    written += chunk.length;
    blockNum += 1;
    onProgress(Math.round((written / total) * 100));
  }

  onLog("Write complete. Triggering manifest (device will reset and boot new firmware)...");
  // Zero-length DNLOAD signals end of transfer -> device manifests + resets.
  await device.controlTransferOut({
    requestType: "class",
    recipient: "interface",
    request: DFU_DNLOAD,
    value: blockNum,
    index: ifaceNumber,
  });
  try {
    const st = await getStatus(device, ifaceNumber);
    if (st.state === STATE_dfuMANIFEST) {
      onLog("Manifesting...");
    }
  } catch {
    // Device may have already detached/reset by this point — that's expected.
  }

  try {
    await device.close();
  } catch {
    /* device likely already disconnected on reset */
  }
  onLog("Done — power-cycle or set BOOT0 low if the board doesn't restart automatically.");
}
