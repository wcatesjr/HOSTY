import React, { useState, useEffect } from 'react';

interface OPTEUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (url: string) => Promise<void>;
}

const DEFAULT_CONFLUENCE_URL = 'https://confluence.dsone.3ds.com/spaces/ULM/pages/193167576/On-Prem+Test+Environments';

const OPTEUpdateDialog: React.FC<OPTEUpdateDialogProps> = ({ isOpen, onClose, onUpdate }) => {
  const [url, setUrl] = useState(DEFAULT_CONFLUENCE_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load saved URL preference
      loadSavedUrl();
    }
  }, [isOpen]);

  const loadSavedUrl = async () => {
    try {
      const savedUrl = await window.electronAPI.getConfluenceUrl();
      if (savedUrl) {
        setUrl(savedUrl);
      }
    } catch (error) {
      console.error('Failed to load saved URL:', error);
    }
  };

  const handleOpenBrowser = async () => {
    if (!url.trim()) {
      alert('Please enter a valid URL');
      return;
    }

    try {
      // Save the URL for future use
      await window.electronAPI.saveConfluenceUrl(url);
      
      // Open browser window
      const result = await window.electronAPI.openConfluenceBrowser(url);
      if (result.success) {
        setBrowserOpen(true);
      } else {
        alert(`Error opening browser: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleExtract = async () => {
    setIsLoading(true);
    try {
      // Extract and parse from browser window
      const result = await window.electronAPI.extractConfluencePage();
      if (result.success && result.environments) {
        // Update environments using the extracted data
        const updateResult = await window.electronAPI.updateOPTEEnvironments(url);
        if (updateResult.success) {
          alert(`Successfully extracted ${result.environments.length} environments. ${updateResult.added || 0} added, ${updateResult.updated || 0} updated, ${updateResult.markedOld || 0} marked as OLD.`);
          onClose();
          setBrowserOpen(false);
          // Trigger refresh
          await onUpdate(url);
        } else {
          alert(`Error updating environments: ${updateResult.error}`);
        }
      } else {
        alert(`Error extracting page: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!url.trim()) {
      alert('Please enter a valid URL');
      return;
    }

    if (!confirm('This will update On-Prem Test Environments from the Confluence page. Continue?')) {
      return;
    }

    setIsLoading(true);
    try {
      // Save the URL for future use
      await window.electronAPI.saveConfluenceUrl(url);
      await onUpdate(url);
      // Close dialog after successful update
      onClose();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Update On-Prem Test Environments</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="form-group">
          <label className="form-label">Confluence URL</label>
          <input
            type="text"
            className="form-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://confluence.dsone.3ds.com/..."
            disabled={isLoading}
          />
          <div className="help-text" style={{ color: '#e74c3c', fontWeight: 'bold', marginBottom: '12px' }}>
            ⚠️ Authentication Required: You must log in to Confluence for this function to work properly.
          </div>
          <div className="help-text">
            This URL will be saved and used for future updates. Click "Open Browser" to log in to Confluence, then click "Extract Environments" to parse the page.
          </div>
        </div>
        <div className="form-actions">
          {!browserOpen ? (
            <>
              <button 
                className="btn btn-primary" 
                onClick={handleOpenBrowser}
                disabled={isLoading || !url.trim()}
              >
                Open Browser
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleUpdate}
                disabled={isLoading || !url.trim()}
              >
                {isLoading ? 'Updating...' : 'Fetch Directly (No Auth)'}
              </button>
            </>
          ) : (
            <button 
              className="btn btn-success" 
              onClick={handleExtract}
              disabled={isLoading}
            >
              {isLoading ? 'Extracting...' : 'Extract Environments'}
            </button>
          )}
          <button className="btn" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
        </div>
        {isLoading && (
          <div className="help-text" style={{ textAlign: 'center', marginTop: '16px', color: '#667eea' }}>
            Fetching and parsing Confluence page...
          </div>
        )}
      </div>
    </div>
  );
};

export default OPTEUpdateDialog;

