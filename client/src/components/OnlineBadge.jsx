export default function OnlineBadge({ error, loading }) {
  if (error) return <span className="live live--off">연결 재시도 중</span>;
  if (loading) return <span className="live live--off">연결하는 중…</span>;
  return (
    <span className="live">
      <i aria-hidden="true" />
      실시간 · 3초마다 갱신
    </span>
  );
}
