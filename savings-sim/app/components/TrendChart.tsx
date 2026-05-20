'use client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { YearResult } from '../lib/calc';

interface Props {
  results: YearResult[];
}

export default function TrendChart({ results }: Props) {
  const data = results.map(r => {
    const nisaGains       = Math.max(0, r.nisaBalance - r.nisaPrincipal);
    const nonNisaGains    = Math.max(0, r.nonNisaBalance - r.nonNisaPrincipal);
    const taxableGainsNet = Math.round(nonNisaGains * (1 - 0.20315));
    return {
      label:    `${r.year}年`,
      元本:      Math.round(r.principal),
      NISA非課税益: Math.round(nisaGains),
      課税後利益:  taxableGainsNet,
    };
  });

  const tickFmt = (v: number) =>
    v >= 1_0000_0000 ? `${(v / 1_0000_0000).toFixed(0)}億` :
    v >= 10_000      ? `${Math.round(v / 10_000)}万`       : String(v);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }}
          interval={Math.max(0, Math.floor(data.length / 8) - 1)} />
        <YAxis tickFormatter={tickFmt} tick={{ fontSize: 10 }} width={40} />
        <Tooltip
          formatter={(v, name) => [typeof v === 'number' ? `¥${v.toLocaleString()}` : v, name]}
          labelStyle={{ fontSize: 12, fontWeight: 600 }}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="元本"        stackId="a" fill="#93c5fd" radius={[0,0,3,3]} />
        <Bar dataKey="NISA非課税益" stackId="a" fill="#34d399" />
        <Bar dataKey="課税後利益"   stackId="a" fill="#fbbf24" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
