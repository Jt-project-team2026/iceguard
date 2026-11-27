import { LEVELS, levelKeyOf } from "../constants";
import LevelIcon from "./LevelIcon.jsx";

export default function DeviceMarker({ device, selected, onSelect }) {
  const key = levelKeyOf(device);
  const level = LEVELS[key];
  const real = !device.mock;
  const label = `${device.name}, ${device.mock ? "예시 데이터, " : ""}${level.label}${selected ? ", 선택됨" : ""}`;

  return (
    <button
      type="button"
      className={`pin pin--${real ? "real" : "mock"}${selected ? " is-selected" : ""}`}
      style={{ "--pin": level.color }}
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onSelect(device.device_id)}
    >
      {real && (
        <span className="pin__label">
          {device.name}
          <em>실시간</em>
        </span>
      )}
      {real && (key === "danger" || key === "caution") && <span className="pin__halo" />}
      <span className="pin__dot">
        <LevelIcon levelKey={key} size={real ? 28 : 16} color={level.fg} />
      </span>
      {!real && <span className="pin__tag">예시</span>}
    </button>
  );
}
