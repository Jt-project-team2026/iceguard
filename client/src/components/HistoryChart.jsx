import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtClock } from "../utils/format";

const TICK = { fontSize: 11, fill: "#52606D" };

export default function HistoryChart({ data, loading, error, disabledReason }) {
  if (disabledReason) return <div className="chart-empty">{disabledReason}</div>;
  if (error && !data) return <div className="chart-empty">{error.message}</div>;
  if (loading || !data) return <div className="chart-empty">불러오는 중…</div>;
  if (data.length === 0) return <div className="chart-empty">선택한 기간에 기록이 없어요.</div>;

  const span = data[data.length - 1].ts - data[0].ts;
  const showSec = span < 10 * 60 * 1000;

  return (
    <div role="img" aria-label="온도와 습도 변화 그래프">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#E3E9EF" vertical={false} />
          <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(v) => fmtClock(v, showSec)} tick={TICK} minTickGap={48} />
          <YAxis
            yAxisId="t"
            tick={TICK}
            width={46}
            tickFormatter={(v) => `${v}℃`}
            domain={[(min) => Math.floor(Math.min(min, 2) - 1), (max) => Math.ceil(Math.max(max, 5) + 1)]}
          />
          <YAxis yAxisId="h" orientation="right" tick={TICK} width={46} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            labelFormatter={(v) => fmtClock(v)}
            formatter={(value, name) => [name === "온도" ? `${value}℃` : `${value}%`, name]}
            contentStyle={{ borderRadius: 2, border: "1px solid #D9DEE4", fontSize: 12 }}
          />
          <ReferenceLine yAxisId="t" y={5} stroke="#9AA5B1" strokeDasharray="4 4" label={{ value: "열선 해제 5℃", position: "insideBottomRight", fill: "#52606D", fontSize: 11 }} />
          <ReferenceLine yAxisId="t" y={2} stroke="#C62D20" strokeDasharray="6 5" label={{ value: "열선 작동 기준 2℃", position: "insideBottomRight", fill: "#9E1F15", fontSize: 11 }} />
          <Line yAxisId="h" type="monotone" dataKey="hum" name="습도" stroke="#5E8FC7" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Line yAxisId="t" type="monotone" dataKey="temp" name="온도" stroke="#1F2933" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span><i style={{ background: "#1F2933" }} />온도(℃)</span>
        <span><i style={{ background: "#5E8FC7" }} />습도(%)</span>
        <span><i className="dash" />작동 기준</span>
      </div>
    </div>
  );
}
