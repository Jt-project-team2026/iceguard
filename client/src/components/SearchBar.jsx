import { useState } from "react";
import { LEVELS, levelKeyOf } from "../constants";

const Recognition = typeof window !== "undefined" ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined;

export default function SearchBar({ devices, onPick }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);

  const text = query.trim();
  const results = text ? devices.filter((d) => d.name.replace(/\s/g, "").includes(text.replace(/\s/g, ""))) : [];

  function startVoice() {
    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.onresult = (event) => {
      setQuery(event.results[0][0].transcript);
      setOpen(true);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  return (
    <div className="search">
      <div className="search__box">
        <input
          type="search"
          value={query}
          placeholder="구간 이름으로 검색"
          aria-label="구간 이름으로 검색"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && results[0]) {
              onPick(results[0].device_id);
              setOpen(false);
            }
          }}
        />
        {Recognition && (
          <button type="button" className="search__mic" aria-label="음성으로 검색" aria-pressed={listening} onClick={startVoice}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0014 0M12 18v3" />
            </svg>
          </button>
        )}
      </div>
      {open && text && (
        <ul className="search__results">
          {results.length === 0 && <li className="search__empty">일치하는 구간이 없어요.</li>}
          {results.map((d) => (
            <li key={d.device_id}>
              <button
                type="button"
                onClick={() => {
                  onPick(d.device_id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className={`legend__shape shape-${levelKeyOf(d)}`} aria-hidden="true" />
                {d.name}
                <small>{LEVELS[levelKeyOf(d)].label}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
