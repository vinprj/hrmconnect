/**
 * Heart rate data received from a Bluetooth heart rate monitor.
 * Follows the Bluetooth Heart Rate Measurement characteristic specification.
 */
export interface HeartRateData {
  /** Current heart rate in beats per minute (BPM) */
  heartRate: number;
  /** RR intervals in milliseconds. Only present if sensor supports RR interval measurements. */
  rrIntervals?: number[];
  /** Total energy expended in kilojoules. Only present if sensor supports energy expended. */
  energyExpended?: number;
  /** Whether sensor contact was detected. Only present if sensor supports contact detection. */
  contactDetected?: boolean;
  /** Unix timestamp when the measurement was received */
  timestamp: number;
}

/**
 * Service for connecting to Bluetooth heart rate monitors using the Web Bluetooth API.
 *
 * Supports devices that implement the standard Bluetooth Heart Rate Service (0x180D),
 * such as the Polar H10, Garmin HRM, and other compatible chest straps and wrist monitors.
 *
 * @example
 * ```typescript
 * const bluetooth = new BluetoothService(
 *   (data) => console.log('Heart rate:', data.heartRate),
 *   () => console.log('Disconnected'),
 *   (level) => console.log('Battery:', level)
 * );
 * await bluetooth.connect();
 * // Later...
 * bluetooth.disconnect();
 * ```
 */
export class BluetoothService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private batteryCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onDataReceived: (data: HeartRateData) => void;
  private onDisconnected: () => void;
  private onBatteryLevel?: (level: number) => void;

  /**
   * Creates a new BluetoothService instance.
   * @param onDataReceived - Callback invoked when heart rate data is received (typically ~1Hz)
   * @param onDisconnected - Callback invoked when the device disconnects
   * @param onBatteryLevel - Optional callback for battery level updates (0-100)
   */
  constructor(
    onDataReceived: (data: HeartRateData) => void,
    onDisconnected: () => void,
    onBatteryLevel?: (level: number) => void
  ) {
    this.onDataReceived = onDataReceived;
    this.onDisconnected = onDisconnected;
    this.onBatteryLevel = onBatteryLevel;
  }

  /**
   * Initiates Bluetooth device pairing and connects to the heart rate service.
   * Opens the browser's Bluetooth device picker for user to select a device.
   * @throws {Error} If Web Bluetooth is not supported or connection fails
   */
  async connect() {
    try {
      console.log('Requesting Bluetooth Device...');

      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
      }

      const HR_SERVICE_UUID = 0x180D;
      const HR_CHARACTERISTIC_UUID = 0x2A37;
      const BATTERY_SERVICE_UUID = 0x180F;
      const BATTERY_LEVEL_CHARACTERISTIC_UUID = 0x2A19;

      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HR_SERVICE_UUID] }],
        optionalServices: [HR_SERVICE_UUID, BATTERY_SERVICE_UUID]
      });

      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect);

      console.log('Connecting to GATT Server...');
      if (!this.device.gatt) {
        throw new Error('GATT server not available on this device');
      }
      this.server = await this.device.gatt.connect();

      // Heart Rate Service
      console.log('Getting Heart Rate Service...');
      this.service = await this.server.getPrimaryService(HR_SERVICE_UUID);

      console.log('Getting Heart Rate Characteristic...');
      this.characteristic = await this.service.getCharacteristic(HR_CHARACTERISTIC_UUID);

      console.log('Starting Notifications...');
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleNotifications);

      // Battery Service (Optional)
      try {
        console.log('Getting Battery Service...');
        const batteryService = await this.server.getPrimaryService(BATTERY_SERVICE_UUID);
        const batteryChar = await batteryService.getCharacteristic(BATTERY_LEVEL_CHARACTERISTIC_UUID);

        // Read initial value
        const value = await batteryChar.readValue();
        const batteryLevel = value.getUint8(0);

        if (this.onBatteryLevel) {
          this.onBatteryLevel(batteryLevel);
        }

        // Subscribe to changes
        this.batteryCharacteristic = batteryChar;
        await batteryChar.startNotifications();
        batteryChar.addEventListener('characteristicvaluechanged', this.handleBatteryNotification);
      } catch (e) {
        console.warn('Battery service not available', e);
      }

      console.log('Connected!');
    } catch (error) {
      console.error('Connection failed', error);
      throw error;
    }
  }

  /**
   * Disconnects from the Bluetooth device and cleans up resources.
   * Removes all event listeners to prevent memory leaks.
   * Safe to call even if not connected.
   */
  disconnect() {
    // Remove event listeners first to prevent memory leaks
    if (this.characteristic) {
      this.characteristic.removeEventListener('characteristicvaluechanged', this.handleNotifications);
    }
    if (this.batteryCharacteristic) {
      this.batteryCharacteristic.removeEventListener('characteristicvaluechanged', this.handleBatteryNotification);
    }
    if (this.device) {
      this.device.removeEventListener('gattserverdisconnected', this.handleDisconnect);
      if (this.device.gatt?.connected) {
        this.device.gatt.disconnect();
      }
    }
    // Reset references
    this.characteristic = null;
    this.batteryCharacteristic = null;
    this.service = null;
    this.server = null;
    this.device = null;
  }

  private handleDisconnect = () => {
    console.log('Device disconnected');
    this.onDisconnected();
  }

  private handleNotifications = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (value) {
      const data = this.parseHeartRate(value);
      this.onDataReceived(data);
    }
  }

  private handleBatteryNotification = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (value && this.onBatteryLevel) {
      this.onBatteryLevel(value.getUint8(0));
    }
  }

  /**
   * Parses the raw Bluetooth Heart Rate Measurement characteristic data.
   * Follows Bluetooth SIG specification for Heart Rate Measurement (0x2A37).
   * @param value - DataView containing the raw characteristic value
   * @returns Parsed heart rate data including HR and optional RR intervals
   */
  private parseHeartRate(value: DataView): HeartRateData {
    const flags = value.getUint8(0);
    const rate16Bits = flags & 0x1;
    let heartRate: number;
    let offset = 1;

    if (rate16Bits) {
      heartRate = value.getUint16(offset, true);
      offset += 2;
    } else {
      heartRate = value.getUint8(offset);
      offset += 1;
    }

    const rrIntervals: number[] = [];
    if (flags & 0x10) {
      while (offset + 2 <= value.byteLength) {
        const rr = value.getUint16(offset, true);
        offset += 2;
        // Convert to ms (resolution is 1/1024s)
        rrIntervals.push((rr / 1024) * 1000);
      }
    }

    return {
      heartRate,
      rrIntervals: rrIntervals.length > 0 ? rrIntervals : undefined,
      timestamp: Date.now()
    };
  }
}
