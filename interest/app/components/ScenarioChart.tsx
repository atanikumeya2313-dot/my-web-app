'use client';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { YearResult } from '../lib/calc';

interface Props {
  bear: YearResult[];
  base: YearResult[];
  bull: YearResult[];
  bearRate: number;
  baseRate: number;
  bullRate: number;
}

export default function ScenarioChart({ bear, base, bull, bearRate, baseRate, bullRate }: Props) {
  const data = base.map((r, i) => ({
    label: `${r.year}年`,
    [`悲観 ${bearRate}%`]: Math.round(bear[i]?.afterTaxBalance ?? 0),
    [`標準 ${baseRate}%`]: Math.round(r.afterTaxBalance),
    [`楽観 ${bullRate}%`]: Math.round(bull[i]?.afterTaxBalance ?? 0),
  }));

  const tickFmt = (v: number) =>
    v >= 1_0000_0000 ? `${(v / 1_0000_0000).toFixed(0)}億` :
    v >= 10_000      ? `${Math.round(v / 10_000)}万` : String(v);

  const bearKey = `悲観 ${bearRate}%`;
  const baseKey = `標準 ${baseRate}%`;
  const bullKey = `楽観 ${bullRate}%`;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }}
          interval={Math.max(0, Math.floor(data.length / 8) - 1)} />
        <YAxis tickFormatter={tickFmt} tick={{ fontSize: 10 }} width={40} />
        <Tooltip
          formatter={(v, name) => [typeof v === 'number' ? `¥${v.toLocaleString()}` : v, name]}
          labelStyle={{ fontSize: 12, fontWeight: 600 }}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        <Line dataKey={bearKey} stroke="#f87171" strokeWidth={2} dot={false} />
        <Line dataKey={baseKey} stroke="#3b82f6" strokeWidth={2} dot={false} />
        <Line dataKey={bullKey} stroke="#34d399" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
