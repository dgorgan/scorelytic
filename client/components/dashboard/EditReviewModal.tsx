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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg border border-gray-300">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Review Fields</h2>
        {reviewFields.map(field => (
          <div key={field} className="mb-4">
            <label className="block mb-2 text-gray-900 font-semibold">{field}</label>
            <textarea
              className="w-full border border-gray-300 rounded p-2 text-gray-900 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={2}
              value={editedFields[field] ?? ''}
              onChange={e => setEditedFields(prev => ({ ...prev, [field]: e.target.value }))}
            />
          </div>
        ))}
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <div className="flex gap-2 justify-end mt-4">
          <button
            className="px-3 py-1 bg-neutral-200 text-gray-900 rounded hover:bg-neutral-300 focus:outline-none"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 focus:outline-none"
            disabled={saving || !hasChanges}
            onClick={handleSave}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
} 