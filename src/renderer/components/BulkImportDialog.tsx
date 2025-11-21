import React, { useState } from 'react';
import { HostEntry } from '../../shared/types';

interface BulkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (entries: HostEntry[]) => void;
}

const BulkImportDialog: React.FC<BulkImportDialogProps> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleImport = async () => {
    try {
      const entries = await window.electronAPI.parseBulkEntries(text);
      if (entries.length === 0) {
        alert('No valid entries found. Please check the format.');
        return;
      }
      onImport(entries);
      setText('');
      onClose();
    } catch (error: any) {
      alert(`Error parsing entries: ${error.message}`);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Bulk Import Entries</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="form-group">
          <label className="form-label">
            Paste entries (one per line):
          </label>
          <textarea
            className="bulk-import-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="192.168.1.100    server1.example.com    # Server 1&#10;192.168.1.101    server2.example.com    # Server 2"
          />
          <div className="help-text">
            Format: IP address, hostname, optional comment<br/>
            Example: 192.168.1.100    server1.example.com    # Server 1
          </div>
          <div className="bulk-import-example">
            Example format:<br/>
            192.168.1.100    server1.example.com    # Server 1<br/>
            192.168.1.101    server2.example.com    # Server 2<br/>
            10.0.0.1         api.example.com
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleImport}>
            Import Entries
          </button>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkImportDialog;

