import * as Tooltip from '@radix-ui/react-tooltip';
import { GroupedResult, Result, displayCell, prettyTooltip } from './utils';

interface GroupedTableProps {
  filteredGroupedResults: (GroupedResult & { hasMismatch: boolean })[];
  reviewFields: string[];
  results: Result[];
  onEditReview: (index: number) => void;
}

export default function GroupedTable({ 
  filteredGroupedResults, 
  reviewFields, 
  results, 
  onEditReview 
}: GroupedTableProps) {
  return (
    <div className="overflow-x-auto mt-8 max-w-full">
      <table className="w-full min-w-max border border-gray-300 rounded-lg shadow text-sm bg-white">
        <thead className="bg-neutral-100 sticky top-0 z-10">
          <tr>
            <th className="px-4 py-2 border-b font-bold text-gray-900 w-[120px] max-w-[300px]">Review ID</th>
            {reviewFields.map(field => (
              <th key={field} className="px-4 py-2 border-b font-bold text-gray-900 w-[180px] max-w-[300px]">{field}</th>
            ))}
            <th className="px-4 py-2 border-b font-bold text-gray-900 w-[100px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredGroupedResults.map((row: GroupedResult & { hasMismatch: boolean }, i: number) => (
            <tr
              key={row.reviewId}
              className={
                row.hasMismatch
                  ? 'bg-red-50 hover:bg-red-100 transition-colors'
                  : i % 2 === 0
                  ? 'bg-white hover:bg-neutral-100 transition-colors'
                  : 'bg-yellow-50 hover:bg-yellow-100 transition-colors'
              }
            >
              <td className="px-4 py-2 border-b w-[120px] max-w-[300px] text-black">{row.reviewId}</td>
              {reviewFields.map((field: string) => (
                <td key={field} className="px-4 py-2 border-b w-[180px] max-w-[300px] text-black align-top">
                  <div className="bg-gray-50 rounded p-2 mb-1 border border-gray-200">
                    <span className="font-bold text-xs text-gray-600">Seed</span>
                    <Tooltip.Root delayDuration={200}>
                      <Tooltip.Trigger asChild>
                        <div className="text-sm text-gray-700 break-words line-clamp-2 cursor-help">
                          {displayCell(results[row.idxs[field]]?.seed)}
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content className="z-50 max-w-xs rounded bg-gray-900 text-white px-3 py-2 text-xs shadow-lg whitespace-pre-line" side="top" align="center">
                          {prettyTooltip(results[row.idxs[field]]?.seed)}
                          <Tooltip.Arrow className="fill-gray-900" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </div>
                  <div className="border-t border-dashed border-blue-200 my-1" />
                  <div className="bg-blue-50 rounded p-2 mt-1 border border-blue-100">
                    <span className="font-bold text-xs text-blue-700">LLM</span>
                    <Tooltip.Root delayDuration={200}>
                      <Tooltip.Trigger asChild>
                        <div className="text-sm text-blue-900 break-words line-clamp-2 cursor-help">
                          {displayCell(row.fields[field])}
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content className="z-50 max-w-xs rounded bg-gray-900 text-white px-3 py-2 text-xs shadow-lg whitespace-pre-line" side="top" align="center">
                          {prettyTooltip(row.fields[field])}
                          <Tooltip.Arrow className="fill-gray-900" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </div>
                </td>
              ))}
              <td className="px-4 py-2 border-b w-[100px] text-center">
                <button
                  className="px-2 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                  onClick={() => onEditReview(i)}
                >Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 