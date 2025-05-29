import * as Tooltip from '@radix-ui/react-tooltip';

export default function RowColorLegend() {
  return (
    <div className="flex flex-wrap gap-4 items-center mb-4 mt-2 text-xs font-semibold bg-neutral-100 border border-neutral-300 rounded px-3 py-2 shadow-sm">
      <div className="flex items-center gap-1">
        <span className="inline-block w-4 h-4 rounded bg-red-400 border-2 border-red-700"></span>
        <span className="text-red-800">Mismatch</span>
        <Tooltip.Root delayDuration={100}>
          <Tooltip.Trigger asChild>
            <span className="ml-1 text-gray-500 cursor-help">?</span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-50 rounded bg-gray-900 text-white px-2 py-1 text-xs shadow-lg"
              side="top"
              align="center"
            >
              At least one field in this row has a similarity &lt; 0.8 between LLM and seed
              (disagreement)
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block w-4 h-4 rounded bg-green-400 border-2 border-green-700"></span>
        <span className="text-green-900">Overridden</span>
        <Tooltip.Root delayDuration={100}>
          <Tooltip.Trigger asChild>
            <span className="ml-1 text-gray-500 cursor-help">?</span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-50 rounded bg-gray-900 text-white px-2 py-1 text-xs shadow-lg"
              side="top"
              align="center"
            >
              This row has been manually edited/overridden by a reviewer
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block w-4 h-4 rounded bg-yellow-300 border-2 border-yellow-700"></span>
        <span className="text-yellow-900">Alt row</span>
        <Tooltip.Root delayDuration={100}>
          <Tooltip.Trigger asChild>
            <span className="ml-1 text-gray-500 cursor-help">?</span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-50 rounded bg-gray-900 text-white px-2 py-1 text-xs shadow-lg"
              side="top"
              align="center"
            >
              Alternating row color for readability (no special meaning)
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block w-4 h-4 rounded bg-white border-2 border-gray-500"></span>
        <span className="text-gray-800">Normal</span>
        <Tooltip.Root delayDuration={100}>
          <Tooltip.Trigger asChild>
            <span className="ml-1 text-gray-500 cursor-help">?</span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-50 rounded bg-gray-900 text-white px-2 py-1 text-xs shadow-lg"
              side="top"
              align="center"
            >
              No mismatches, no overrides (all similarities ≥ 0.8)
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
    </div>
  );
}
