import { LEVELS, levelKeyOf } from "../constants";
import { fmtTemp } from "../utils/format";

/** 구간 목록. 목데이터는 점선 + '예시' 표시로 실측과 구분한다. */
export default function DeviceList({ devices, selectedId, onSelect, favorites = [], heading = "다른 구간" }) {
  return (
    <section className="dlist" aria-label={heading}>
      <h3 className="dlist__title">{heading}</h3>
      <ul>
        {devices.map((d) => {
          const key = levelKeyOf(d);
          return (
            <li key={d.device_id}>
              <button
                type="button"
                className={`dlist__row${d.mock ? " is-mock" : ""}${d.device_id === selectedId ? " is-selected" : ""}`}
                aria-current={d.device_id === selectedId}
                onClick={() => onSelect(d.device_id)}
              >
                <span className={`legend__shape shape-${key}`} aria-hidden="true" />
                <span className="dlist__name">
                  {d.name.replace(" (예시)", "")}
                  {favorites.includes(d.device_id) && <span aria-label="즐겨찾기"> ♥</span>}
                </span>
                <span className="dlist__state">
                  {LEVELS[key].label}
                  {key !== "offline" && ` · ${fmtTemp(d.latest.temp)}`}
                </span>
                <span className={`dlist__tag${d.mock ? "" : " dlist__tag--real"}`}>{d.mock ? "예시" : "실물"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
