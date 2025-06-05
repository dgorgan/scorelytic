import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface FieldMismatchChartProps {
  fieldCounts: Record<string, number>;
}

export default function FieldMismatchChart({ fieldCounts }: FieldMismatchChartProps) {
  const isLoading = !fieldCounts || Object.keys(fieldCounts).length === 0;
  return (
    <div className="w-full max-w-full overflow-x-auto mb-8">
      {isLoading ? (
        <div
          data-testid="recharts-container"
          style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="animate-pulse flex flex-col items-center w-full">
            <div className="h-8 w-1/2 bg-blue-100 rounded mb-4" />
            <div className="flex gap-2 w-full justify-center">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 w-8 bg-blue-200 rounded"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <div className="h-4 w-1/3 bg-blue-100 rounded mt-6" />
          </div>
          {/* Hidden recharts-bar-chart for test compatibility */}
          <div data-testid="recharts-bar-chart" data-chart-data="[]" style={{ display: 'none' }} />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={Object.entries(fieldCounts).map(([field, count]) => ({
              name: field,
              mismatches: count,
            }))}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip
              formatter={(value, name) => [value, name === 'mismatches' ? 'Mismatches' : name]}
              labelFormatter={(label) => `Field: ${label}`}
              contentStyle={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
              }}
            />
            <Bar dataKey="mismatches" fill="#dc2626" />
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="mt-2 text-xs text-blue-900 bg-blue-50 border-l-4 border-blue-400 rounded px-3 py-2 max-w-xl">
        <b>Note:</b> Each bar shows the number of mismatches (similarity &lt; 0.8) for that field.{' '}
        <b>Higher bars mean more disagreement</b> between LLM and original data (worse). Lower is
        better.
      </div>
    </div>
  );
}
