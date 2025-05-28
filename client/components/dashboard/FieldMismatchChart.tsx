import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface FieldMismatchChartProps {
  fieldCounts: Record<string, number>;
}

export default function FieldMismatchChart({ fieldCounts }: FieldMismatchChartProps) {
  return (
    <div className="w-full max-w-full overflow-x-auto mb-8">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={Object.entries(fieldCounts).map(([field, count]) => ({
            name: field,
            mismatches: count
          }))}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <RechartsTooltip 
            formatter={(value, name) => [value, name === 'mismatches' ? 'Mismatches' : name]}
            labelFormatter={(label) => `Field: ${label}`}
            contentStyle={{ 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca',
              borderRadius: '6px'
            }}
          />
          <Bar dataKey="mismatches" fill="#dc2626" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 text-xs text-blue-900 bg-blue-50 border-l-4 border-blue-400 rounded px-3 py-2 max-w-xl">
        <b>Note:</b> Each bar shows the number of mismatches (similarity &lt; 0.8) for that field. <b>Higher bars mean more disagreement</b> between LLM and original data (worse). Lower is better.
      </div>
    </div>
  );
} 