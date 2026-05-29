"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface Props {
  investition: number;
  cashGewinnMonat: number;
  breakEvenMonate: number;
}

export default function AmortizationChart({ investition, cashGewinnMonat, breakEvenMonate }: Props) {
  const data = Array.from({ length: 37 }, (_, i) => ({
    monat: i,
    kumuliert: Math.round(cashGewinnMonat * i - investition),
  }));

  const yMin = Math.min(-investition, -500);
  const yMax = Math.max(cashGewinnMonat * 36 - investition + 500, 500);

  const beLabel = isFinite(breakEvenMonate) && breakEvenMonate <= 36
    ? `Break-Even: Monat ${Math.ceil(breakEvenMonate)}`
    : null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="monat"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => v === 0 ? "Start" : `M${v}`}
          ticks={[0, 6, 12, 18, 24, 30, 36]}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          domain={[yMin, yMax]}
        />
        <Tooltip
          formatter={(val) =>
            [`${Number(val).toLocaleString("de-DE")} €`, "Kum. Ergebnis"]
          }
          labelFormatter={(l) => l === 0 ? "Start" : `Monat ${l}`}
        />
        <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1.5} />
        {beLabel && isFinite(breakEvenMonate) && breakEvenMonate <= 36 && (
          <ReferenceLine
            x={Math.ceil(breakEvenMonate)}
            stroke="#AADD00"
            strokeWidth={2}
            strokeDasharray="4 3"
            label={{ value: beLabel, position: "insideTopRight", fontSize: 10, fill: "#3D5278" }}
          />
        )}
        <Line
          type="monotone"
          dataKey="kumuliert"
          stroke="#3D5278"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: "#3D5278" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
