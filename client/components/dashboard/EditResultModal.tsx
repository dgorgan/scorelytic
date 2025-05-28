import { useState, useEffect } from 'react';
import { Result } from './utils';

interface EditResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: Result;
  onSave: (updatedResult: Partial<Result>) => Promise<void>;
}

export default function EditResultModal({
  isOpen,
  onClose,
  result,
  onSave
}: EditResultModalProps) {
  const [editedLlm, setEditedLlm] = useState('');
  const [editedSimilarity, setEditedSimilarity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update state when result changes or modal opens
  useEffect(() => {
    if (isOpen && result) {
      setEditedLlm(result.llm || '');
      setEditedSimilarity(result.similarity || '');
      setError(null);
    }
  }, [isOpen, result]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    // Validate similarity score
    const similarity = parseFloat(editedSimilarity);
    if (isNaN(similarity) || similarity < 0 || similarity > 1) {
      setError('Similarity must be a number between 0 and 1');
      setSaving(false);
      return;
    }
    
    try {
      await onSave({
        llm: editedLlm,
        similarity: editedSimilarity
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedLlm(result?.llm || '');
    setEditedSimilarity(result?.similarity || '');
    setError(null);
    onClose();
  };

  const hasChanges = editedLlm !== (result?.llm || '') || editedSimilarity !== (result?.similarity || '');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-gray-300 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Review Fields</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block mb-2 text-gray-900 font-semibold">LLM Output</label>
            <textarea
              className="w-full border border-gray-300 rounded p-3 text-gray-900 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-vertical min-h-[120px]"
              value={editedLlm}
              onChange={e => setEditedLlm(e.target.value)}
              placeholder="Enter LLM output..."
            />
          </div>
          
          <div>
            <label className="block mb-2 text-gray-900 font-semibold">Similarity</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded p-3 text-gray-900 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={editedSimilarity}
              onChange={e => setEditedSimilarity(e.target.value)}
              placeholder="0.0 - 1.0"
            />
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {error && <div className="text-red-600 mb-4 p-3 bg-red-50 border border-red-200 rounded">{error}</div>}
          <div className="flex gap-3 justify-end">
            <button
              className="px-4 py-2 bg-neutral-200 text-gray-900 rounded hover:bg-neutral-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={saving || !hasChanges}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 