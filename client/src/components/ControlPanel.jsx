import { useEffect, useRef, useState } from "react";
import { sendCommand } from "../api";
import { MODE_LABEL } from "../constants";

const DURATIONS = [30, 60, 180, 300];

/**
 * 관리자 수동 제어. 서버는 모드를 저장만 하고, ESP32 가 다음 보고(최대 5초 뒤)에서 받아 적용한다.
 * 강제 모드는 정해진 시간이 지나면 자동으로 AUTO 로 돌아가며, 과열·센서 오류·연속 작동 한도는 항상 우선한다.
 */
export default function ControlPanel({ device, password, onUnauthorized, onChanged }) {
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  if (!device) return null;
  const isMock = Boolean(device.mock);
  const mode = device.mode ?? "AUTO";
  const remaining = device.mode_remaining_sec ?? 0;

  const send = async (next) => {
    setBusy(true);
    setError("");
    try {
      await sendCommand(device.device_id, next, duration, password);
      onChanged?.();
    } catch (e) {
      if (e.status === 401) onUnauthorized?.();
      else if (aliveRef.current) setError(e.message);
    } finally {
      if (aliveRef.current) setBusy(false);
    }
  };

  const disabled = busy || isMock;

  return (
    <section className="panel" aria-label="열선 수동 제어">
      <div className="panel__head">
        <h2>열선 수동 제어 · {device.name.replace(" (예시)", "")}</h2>
        <span className={`tag ${mode === "AUTO" ? "tag--neutral" : "tag--info"}`}>
          현재 {MODE_LABEL[mode]}
          {mode !== "AUTO" ? ` · ${remaining}초 남음` : ""}
        </span>
      </div>

      {isMock ? (
        <p className="ctl-note">예시 구간은 제어할 수 없어요. 실물 장치를 선택하세요.</p>
      ) : (
        <>
          <div className="ctl-row">
            <button type="button" className="ctl-btn" disabled={disabled || mode === "AUTO"} onClick={() => send("AUTO")}>
              자동으로 복귀
            </button>
            <button type="button" className="ctl-btn ctl-btn--on" disabled={disabled} onClick={() => send("FORCE_ON")}>
              강제 켜기
            </button>
            <button type="button" className="ctl-btn ctl-btn--off" disabled={disabled} onClick={() => send("FORCE_OFF")}>
              강제 끄기
            </button>
            <div className="ctl-dur">
              <span className="muted">유지 시간</span>
              <div className="seg" role="group" aria-label="강제 모드 유지 시간">
                {DURATIONS.map((s) => (
                  <button key={s} type="button" aria-pressed={duration === s} onClick={() => setDuration(s)}>
                    {s >= 60 ? `${s / 60}분` : `${s}초`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && (
            <p className="ctl-error" role="alert">
              {error}
            </p>
          )}
          {!device.online && <p className="ctl-note">장치가 오프라인이에요. 다시 연결되면 남은 시간 동안만 적용돼요.</p>}
          <p className="ctl-note">
            장치가 다음 보고 때(최대 5초 뒤) 명령을 받아 적용해요. 시간이 끝나거나 서버와 끊기면 자동 모드로 돌아가고, 패드 과열·센서
            오류·연속 작동 한도는 수동 모드에서도 항상 우선해요.
          </p>
        </>
      )}
    </section>
  );
}
