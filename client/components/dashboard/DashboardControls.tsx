interface DashboardControlsProps {
  showMismatches: boolean;
  setShowMismatches: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  filter: 'all' | 'unreviewed' | 'overridden';
  setFilter: (value: 'all' | 'unreviewed' | 'overridden') => void;
  csvFile: string;
  setCsvFile: (value: string) => void;
  csvOptions: { label: string; value: string }[];
  groupedView: boolean;
  setGroupedView: (value: boolean) => void;
  onDownloadCSV: () => void;
}

export default function DashboardControls({
  showMismatches,
  setShowMismatches,
  search,
  setSearch,
  filter,
  setFilter,
  csvFile,
  setCsvFile,
  csvOptions,
  groupedView,
  setGroupedView,
  onDownloadCSV,
}: DashboardControlsProps) {
  return (
    <div className="mb-4">
      {/* First Row */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <label className="flex items-center gap-2 text-gray-900 font-medium">
          <input
            type="checkbox"
            checked={showMismatches}
            onChange={(e) => setShowMismatches(e.target.checked)}
            className="w-4 h-4"
          />
          Show only mismatches
        </label>

        <input
          type="text"
          className="border border-gray-300 rounded px-3 py-2 bg-neutral-50 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-400 min-w-[280px]"
          placeholder="Search reviewId, field, text..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          className="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow"
          onClick={onDownloadCSV}
        >
          Download CSV
        </button>
      </div>

      {/* Second Row */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded font-medium ${filter === 'all' ? 'bg-blue-700 text-white' : 'bg-neutral-200 text-gray-900'} hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`px-3 py-1 rounded font-medium ${filter === 'unreviewed' ? 'bg-blue-700 text-white' : 'bg-neutral-200 text-gray-900'} hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400`}
            onClick={() => setFilter('unreviewed')}
          >
            Unreviewed
          </button>
          <button
            className={`px-3 py-1 rounded font-medium ${filter === 'overridden' ? 'bg-blue-700 text-white' : 'bg-neutral-200 text-gray-900'} hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400`}
            onClick={() => setFilter('overridden')}
          >
            Overridden
          </button>
        </div>

        <label className="flex items-center gap-2 text-gray-900 font-medium">
          <span className="font-semibold">Sweep:</span>
          <select
            className="border border-gray-300 rounded px-2 py-1 bg-neutral-50 text-gray-900 focus:ring-2 focus:ring-blue-400"
            value={csvFile}
            onChange={(e) => setCsvFile(e.target.value)}
          >
            {csvOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <button
          className={`px-3 py-1 rounded font-medium ${groupedView ? 'bg-blue-700 text-white' : 'bg-neutral-200 text-gray-900'} hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400`}
          onClick={() => setGroupedView(true)}
        >
          Grouped View
        </button>
        <button
          className={`px-3 py-1 rounded font-medium ${!groupedView ? 'bg-blue-700 text-white' : 'bg-neutral-200 text-gray-900'} hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400`}
          onClick={() => setGroupedView(false)}
        >
          Advanced QA
        </button>
      </div>
    </div>
  );
}
