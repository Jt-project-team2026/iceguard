/** 단계를 색뿐 아니라 모양으로도 구분하는 아이콘 (✓ / △ / 팔각 / −) */
export default function LevelIcon({ levelKey, size = 24, color = "#fff" }) {
  const common = {
    "aria-hidden": true,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (levelKey === "safe") {
    return (
      <svg {...common} strokeWidth="3">
        <path d="M6 12.5l4 4 8-9" />
      </svg>
    );
  }
  if (levelKey === "caution") {
    return (
      <svg {...common} strokeWidth="2.6">
        <path d="M12 4l9 16H3z" />
        <path d="M12 10v5" />
        <path d="M12 17.8v.2" />
      </svg>
    );
  }
  if (levelKey === "danger") {
    return (
      <svg {...common} strokeWidth="2.4">
        <polygon points="8,3 16,3 21,8 21,16 16,21 8,21 3,16 3,8" />
        <path d="M12 8v5" />
        <path d="M12 16v.2" />
      </svg>
    );
  }
  return (
    <svg {...common} strokeWidth="3">
      <path d="M6 12h12" />
    </svg>
  );
}
