'use client';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { YearResult, WithdrawalYearResult } from '../lib/calc';

interface Props {
  accumResults: YearResult[];
  withdrawResults: WithdrawalYearResult[];
  accumYears: number;
}

export default function CombinedChart({ accumResults, withdrawResults, accumYears }: Props) {
  const accumData = accumResults.map(r => ({
    label: `${r.year}年`,
    積み立て残高: Math.round(r.afterTaxBalance),
    取り崩し残高: undefined as number | undefined,
  }));

  const withdrawData = withdrawResults.slice(1).map(r => ({
    label: `${accumYears + r.year}年`,
    積み立て残高: undefined as number | undefined,
    取り崩し残高: r.balance,
  }));

  // 接続点：最終積み立て年 = 取り崩し開始年
  const pivot = accumResults[accumResults.length - 1];
  withdrawData.unshift({
    label: `${accumYears}年`,
    積み立て残高: Math.round(pivot.afterTaxBalance),
    取り崩し残高: Math.round(pivot.afterTaxBalance),
  });

  const data = [...accumData.slice(0, -1), ...withdrawData];

  const tickFmt = (v: number) =>
    v >= 1_0000_0000 ? `${(v / 1_0000_0000).toFixed(0)}億` :
    v >= 10_000      ? `${Math.round(v / 10_000)}万` : String(v);

  const interval = Math.max(0, Math.floor(data.length / 10) - 1);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={interval} />
        <YAxis tickFormatter={tickFmt} tick={{ fontSize: 10 }} width={40} />
        <Tooltip
          formatter={(v, name) => [typeof v === 'number' ? `¥${v.toLocaleString()}` : v, name]}
          labelStyle={{ fontSize: 12, fontWeight: 600 }}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine x={`${accumYears}年`} stroke="#94a3b8" strokeDasharray="4 2"
          label={{ value: '取り崩し開始', position: 'top', fontSize: 10, fill: '#94a3b8' }} />
        <Line dataKey="積み立て残高" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={false} />
        <Line dataKey="取り崩し残高" stroke="#f97316" strokeWidth={2} dot={false} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
