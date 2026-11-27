import { LEVELS } from "../constants";

export default function Legend() {
  return (
    <ul className="legend" aria-label="범례">
      {["safe", "caution", "danger", "offline"].map((key) => (
        <li key={key} className="legend__item">
          <span className={`legend__shape shape-${key}`} aria-hidden="true" />
          {LEVELS[key].label}
        </li>
      ))}
    </ul>
  );
}
