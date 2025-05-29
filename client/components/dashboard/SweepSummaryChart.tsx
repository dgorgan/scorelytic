import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface SweepSummaryRow {
  model: string;
  prompt: string;
  field: string;
  total_mismatches: string;
  total_comparisons: string;
}

interface SweepSummaryChartProps {
  sweepSummary: SweepSummaryRow[];
}

export default function SweepSummaryChart({ sweepSummary }: SweepSummaryChartProps) {
  return (
    <div className="w-full max-w-full overflow-x-auto mb-8">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={sweepSummary.map((row) => ({
            name: `${row.model} | ${row.prompt} | ${row.field}`,
            mismatches: parseInt(row.total_mismatches),
            model: row.model,
            prompt: row.prompt,
            field: row.field,
            comparisons: parseInt(row.total_comparisons),
          }))}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <RechartsTooltip
            formatter={(value, name) => [value, name === 'mismatches' ? 'Mismatches' : name]}
            labelFormatter={(label) => `Configuration: ${label}`}
            contentStyle={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
            }}
          />
          <Bar dataKey="mismatches" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
