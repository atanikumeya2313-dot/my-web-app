'use client';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { WithdrawalYearResult } from '../lib/calc';

interface Props {
  results: WithdrawalYearResult[];
  showReal: boolean;
}

export default function WithdrawalChart({ results, showReal }: Props) {
  const tickFmt = (v: number) =>
    v >= 1_0000_0000 ? `${(v / 1_0000_0000).toFixed(0)}億` :
    v >= 10_000      ? `${Math.floor(v / 10_000)}万` : String(v);

  const data = results.map(r => ({
    label:      `${r.year}年`,
    残高:        r.balance,
    ...(showReal ? { 実質残高: r.realBalance } : {}),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" />
        <Area dataKey="残高" stroke="#3b82f6" fill="url(#balGrad)" strokeWidth={2} dot={false} />
        {showReal && (
          <Area dataKey="実質残高" stroke="#f97316" fill="url(#realGrad)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
