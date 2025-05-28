import * as Tooltip from '@radix-ui/react-tooltip';
import { Result, displayCell, prettyTooltip } from './utils';

interface AdvancedTableProps {
  filteredResults: Result[];
  onEditResult: (index: number) => void;
}

export default function AdvancedTable({ filteredResults, onEditResult }: AdvancedTableProps) {
  return (
    <div className="overflow-x-auto mt-8 max-w-full">
      <table className="w-full min-w-max border border-gray-300 rounded-lg shadow text-sm bg-white">
        <thead className="bg-neutral-100 sticky top-0 z-10">
          <tr>
            <th className="px-4 py-2 border-b font-bold text-gray-900 w-[120px] max-w-[300px]">Review ID</th>
            <th className="px-4 py-2 border-b font-bold text-gray-900 w-[120px] max-w-[300px]">Field</th>
            <th className="px-4 py-2 border-b font-bold text-gray-900 w-[200px] max-w-[300px]">Seed</th>
            <th className="px-4 py-2 border-b font-bold text-gray-900 w-[200px] max-w-[300px]">LLM</th>
            <th className="px-4 py-2 border-b font-bold text-gray-900 w-[100px] max-w-[300px]">Similarity</th>
            <th className="px-4 py-2 border-b font-bold text-gray-900 w-[100px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredResults.map((result: Result, i: number) => (
            <tr
              key={`${result.reviewId}-${result.field}`}
              className={
                parseFloat(result.similarity) < 0.8
                  ? 'bg-red-50 hover:bg-red-100 transition-colors'
                  : i % 2 === 0
                  ? 'bg-white hover:bg-neutral-100 transition-colors'
                  : 'bg-yellow-50 hover:bg-yellow-100 transition-colors'
              }
            >
              <td className="px-4 py-2 border-b w-[120px] max-w-[300px] text-black">{result.reviewId}</td>
              <td className="px-4 py-2 border-b w-[120px] max-w-[300px] text-black">{result.field}</td>
              <td className="px-4 py-2 border-b w-[200px] max-w-[300px] text-black">
                <Tooltip.Root delayDuration={200}>
                  <Tooltip.Trigger asChild>
                    <div className="break-words line-clamp-3 cursor-help">
                      {displayCell(result.seed)}
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content className="z-50 max-w-xs rounded bg-gray-900 text-white px-3 py-2 text-xs shadow-lg whitespace-pre-line" side="top" align="center">
                      {prettyTooltip(result.seed)}
                      <Tooltip.Arrow className="fill-gray-900" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </td>
              <td className="px-4 py-2 border-b w-[200px] max-w-[300px] text-black">
                <Tooltip.Root delayDuration={200}>
                  <Tooltip.Trigger asChild>
                    <div className="break-words line-clamp-3 cursor-help">
                      {displayCell(result.llm)}
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content className="z-50 max-w-xs rounded bg-gray-900 text-white px-3 py-2 text-xs shadow-lg whitespace-pre-line" side="top" align="center">
                      {prettyTooltip(result.llm)}
                      <Tooltip.Arrow className="fill-gray-900" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </td>
              <td className="px-4 py-2 border-b w-[100px] max-w-[300px] text-black">
                <span className={parseFloat(result.similarity) < 0.8 ? 'text-red-600 font-bold' : 'text-green-600'}>
                  {parseFloat(result.similarity).toFixed(2)}
                </span>
              </td>
              <td className="px-4 py-2 border-b w-[100px] text-center">
                <button
                  className="px-2 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                  onClick={() => onEditResult(i)}
                >Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 