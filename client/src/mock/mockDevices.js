import { CAMPUS_CENTER } from "../constants";

// 시연용 예시 구간. 화면에서만 존재하며 서버로 전송되지 않는다.
const BASE = [
  { device_id: "mock-01", name: "구간 B (예시)", d: [0.0008, -0.0006], temp: 8.1, hum: 55, level: "안전", heater: false, state: "OFF", age: 2, online: true },
  { device_id: "mock-02", name: "구간 C (예시)", d: [-0.0007, 0.0009], temp: 3.9, hum: 78, level: "주의", heater: false, state: "OFF", age: 2, online: true },
  { device_id: "mock-03", name: "구간 D (예시)", d: [0.0012, 0.001], temp: 1.2, hum: 88, level: "위험", heater: true, state: "HEATING", age: 2, online: true },
  { device_id: "mock-04", name: "구간 E (예시)", d: [-0.0011, -0.0008], temp: 5.0, hum: 60, level: "안전", heater: false, state: "OFF", age: 720, online: false },
];

export function createMockDevices() {
  return BASE.map((b) => ({
    device_id: b.device_id,
    name: b.name,
    lat: CAMPUS_CENTER.lat + b.d[0],
    lng: CAMPUS_CENTER.lng + b.d[1],
    mock: true,
    online: b.online,
    latest: {
      ts: Date.now() - b.age * 1000,
      temp: b.temp,
      hum: b.hum,
      level: b.level,
      heater: b.heater,
      state: b.state,
      mat_temp: b.heater ? 39 : null,
      age_sec: b.age,
    },
    _base: { temp: b.temp, hum: b.hum },
  }));
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** 값이 살아 움직이는 느낌만 주고, 단계가 바뀌지 않도록 기준값 근처(±0.4)에서만 흔든다. */
export function jitterMock(device) {
  if (!device.online) return device;
  const { temp, hum } = device._base;
  return {
    ...device,
    latest: {
      ...device.latest,
      ts: Date.now() - 2000,
      temp: Math.round(clamp(device.latest.temp + (Math.random() - 0.5) * 0.2, temp - 0.4, temp + 0.4) * 10) / 10,
      hum: Math.round(clamp(device.latest.hum + (Math.random() - 0.5) * 2, hum - 1, hum + 1)),
    },
  };
}
