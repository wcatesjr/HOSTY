import React, { useState, useEffect } from 'react';
import { Environment, HostEntry, EnvironmentCategory } from '../../shared/types';
import BulkImportDialog from './BulkImportDialog';

interface EnvironmentEditorProps {
  environment: Environment | null;
  onSave: () => void;
  onCancel: () => void;
}

const EnvironmentEditor: React.FC<EnvironmentEditorProps> = ({ environment, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EnvironmentCategory>('Other');
  const [entries, setEntries] = useState<HostEntry[]>([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (environment) {
      setName(environment.name);
      setCategory(environment.category || 'Other');
      setEntries([...environment.entries]);
    } else {
      setName('');
      setCategory('Other');
      setEntries([]);
    }
  }, [environment]);

  const handleAddEntry = () => {
    setEntries([...entries, { ip: '', hostname: '', comment: '' }]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleUpdateEntry = (index: number, field: keyof HostEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const handleBulkImport = (importedEntries: HostEntry[]) => {
    setEntries([...entries, ...importedEntries]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setAlert({ type: 'error', message: 'Environment name is required' });
      return;
    }

    if (!category) {
      setAlert({ type: 'error', message: 'Please select a category' });
      return;
    }

    if (entries.length === 0) {
      setAlert({ type: 'error', message: 'At least one entry is required' });
      return;
    }

    // Validate entries
    for (const entry of entries) {
      if (!entry.ip.trim() || !entry.hostname.trim()) {
        setAlert({ type: 'error', message: 'All entries must have an IP address and hostname' });
        return;
      }
    }

    const newEnvironment: Environment = {
      name: name.trim(),
      category: category,
      entries: entries.filter(e => e.ip.trim() && e.hostname.trim())
    };

    try {
      let result;
      if (environment) {
        result = await window.electronAPI.updateEnvironment(environment.name, newEnvironment);
      } else {
        result = await window.electronAPI.addEnvironment(newEnvironment);
      }

      if (result.success) {
        setAlert({ type: 'success', message: `Environment "${newEnvironment.name}" saved successfully` });
        setTimeout(() => {
          onSave();
        }, 1000);
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to save environment' });
      }
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message || 'Failed to save environment' });
    }
  };

  return (
    <>
      <div className="content-area">
        <div className="content-header">
          <h1 className="content-title">
            {environment ? `Edit Environment: ${environment.name}` : 'Create New Environment'}
          </h1>
        </div>
        <div className="content-body">
          {alert && (
            <div className={`alert alert-${alert.type}`}>
              {alert.message}
            </div>
          )}

          <div className="environment-form">
            <div className="form-group">
              <div className="form-group-inline">
                <div className="form-group-name-input">
                  <label className="form-label">Environment Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., 2022 SP1 HF12"
                  />
                </div>
                <div className="form-group-actions">
                  <button className="btn btn-success" onClick={handleSave}>
                    Save Environment
                  </button>
                  <button className="btn" onClick={onCancel}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="category"
                    value="On-Prem Test Environment"
                    checked={category === 'On-Prem Test Environment'}
                    onChange={(e) => setCategory(e.target.value as EnvironmentCategory)}
                  />
                  <span>On-Prem Test Environment</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="category"
                    value="Personal"
                    checked={category === 'Personal'}
                    onChange={(e) => setCategory(e.target.value as EnvironmentCategory)}
                  />
                  <span>Personal</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="category"
                    value="Other"
                    checked={category === 'Other'}
                    onChange={(e) => setCategory(e.target.value as EnvironmentCategory)}
                  />
                  <span>Other</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Host Entries *</label>
              <div className="help-text">
                Add IP addresses, hostnames, and optional comments. Use "Bulk Import" to add multiple entries at once.
              </div>
              <button className="btn btn-primary" onClick={() => setShowBulkImport(true)}>
                Bulk Import
              </button>

              <div className="entries-list">
                {entries.map((entry, index) => (
                  <div key={index} className="entry-item">
                    <input
                      type="text"
                      placeholder="IP Address"
                      value={entry.ip}
                      onChange={(e) => handleUpdateEntry(index, 'ip', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Hostname"
                      value={entry.hostname}
                      onChange={(e) => handleUpdateEntry(index, 'hostname', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Comment (optional)"
                      value={entry.comment || ''}
                      onChange={(e) => handleUpdateEntry(index, 'comment', e.target.value)}
                    />
                    <button
                      className="remove-entry-btn"
                      onClick={() => handleRemoveEntry(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button className="add-entry-btn" onClick={handleAddEntry}>
                + Add Entry
              </button>
            </div>
          </div>
        </div>
      </div>

      <BulkImportDialog
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImport={handleBulkImport}
      />
    </>
  );
};

export default EnvironmentEditor;

