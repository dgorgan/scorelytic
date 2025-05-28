import { useState, useEffect } from 'react';

interface EditReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields: Record<string, string>;
  reviewFields: string[];
  onSave: (updatedFields: Record<string, string>) => Promise<void>;
}

export default function EditReviewModal({
  isOpen,
  onClose,
  fields,
  reviewFields,
  onSave
}: EditReviewModalProps) {
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update state when fields change or modal opens
  useEffect(() => {
    if (isOpen && fields) {
      setEditedFields({ ...fields });
      setError(null);
    }
  }, [isOpen, fields]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await onSave(editedFields);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedFields({ ...fields }); // Reset to original values
    setError(null);
    onClose();
  };

  const hasChanges = JSON.stringify(editedFields) !== JSON.stringify(fields);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-gray-300 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Review Fields</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {reviewFields.map(field => (
            <div key={field}>
              <label className="block mb-2 text-gray-900 font-semibold">{field}</label>
              <textarea
                className="w-full border border-gray-300 rounded p-3 text-gray-900 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-vertical min-h-[80px]"
                value={editedFields[field] ?? ''}
                onChange={e => setEditedFields(prev => ({ ...prev, [field]: e.target.value }))}
                placeholder={`Enter ${field}...`}
              />
            </div>
          ))}
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