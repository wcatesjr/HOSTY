import React, { useState, useEffect, useRef } from 'react';
import { Environment } from '../shared/types';
import CurrentProfileBar from './components/CurrentProfileBar';
import EnvironmentList from './components/EnvironmentList';
import EnvironmentEditor from './components/EnvironmentEditor';
import OPTEUpdateDialog from './components/OPTEUpdateDialog';

const App: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [currentEnvironment, setCurrentEnvironment] = useState<string | null>(null);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null | 'new'>(null);
  const [showHostsFile, setShowHostsFile] = useState(false);
  const [hostsFileContent, setHostsFileContent] = useState('');
  const [editedHostsFileContent, setEditedHostsFileContent] = useState('');
  const [isSavingHostsFile, setIsSavingHostsFile] = useState(false);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [customContent, setCustomContent] = useState('');
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [showOPTEUpdate, setShowOPTEUpdate] = useState(false);
  const hostsFileTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('electronAPI is not available! Make sure preload script is loaded.');
      return;
    }
    loadData();
    
    // Refresh current environment every 2 seconds
    const interval = setInterval(async () => {
      try {
        const current = await window.electronAPI.getCurrentEnvironment();
        setCurrentEnvironment(current);
      } catch (error) {
        console.error('Failed to refresh current environment:', error);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      if (!window.electronAPI) {
        console.error('electronAPI not available');
        return;
      }
      const envs = await window.electronAPI.getEnvironments();
      setEnvironments(envs);
      const current = await window.electronAPI.getCurrentEnvironment();
      setCurrentEnvironment(current);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleSelectEnvironment = async (name: string) => {
    if (!confirm(`Are you sure you want to activate environment "${name}"? This will replace your current HOSTS file.`)) {
      return;
    }

    try {
      const result = await window.electronAPI.activateEnvironment(name);
      if (result.success) {
        setCurrentEnvironment(name);
        alert(`Environment "${name}" activated successfully!`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteEnvironment = async (name: string) => {
    try {
      const result = await window.electronAPI.deleteEnvironment(name);
      if (result.success) {
        await loadData();
        if (currentEnvironment === name) {
          setCurrentEnvironment(null);
        }
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleEditEnvironment = async (name: string) => {
    const env = await window.electronAPI.getEnvironmentByName(name);
    if (env) {
      setEditingEnvironment(env);
    }
  };

  const handleAddNew = () => {
    setEditingEnvironment('new');
  };

  const handleSaveEnvironment = () => {
    setEditingEnvironment(null);
    loadData();
  };

  const handleCancelEdit = () => {
    setEditingEnvironment(null);
  };

  const handleViewProfile = async () => {
    try {
      const result = await window.electronAPI.getCurrentHostsFile();
      if (result.success && result.content) {
        setHostsFileContent(result.content);
        setEditedHostsFileContent(result.content);
        setShowHostsFile(true);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (showHostsFile && hostsFileTextareaRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        hostsFileTextareaRef.current?.focus();
        // Move cursor to end of text
        const textarea = hostsFileTextareaRef.current;
        if (textarea) {
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
      }, 100);
    }
  }, [showHostsFile]);

  const handleSaveHostsFile = async () => {
    if (!confirm('Are you sure you want to save these changes to the HOSTS file?')) {
      return;
    }

    setIsSavingHostsFile(true);
    try {
      // Ensure Custom header is present if not already there
      let contentToSave = editedHostsFileContent;
      if (!contentToSave.trim().startsWith('# Custom') && !contentToSave.trim().startsWith('#')) {
        contentToSave = `# Custom\n# Environment activated by HOSTY\n#\n\n${contentToSave}`;
      }
      
      const result = await window.electronAPI.saveHostsFile(contentToSave);
      if (result.success) {
        setHostsFileContent(contentToSave);
        alert('HOSTS file saved successfully!');
        loadData(); // Refresh to update current environment status (will show "Custom")
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSavingHostsFile(false);
    }
  };

  const handleCustom = () => {
    setCustomContent('');
    setShowCustomEditor(true);
  };

  const handleOPTEUpdate = async (url: string) => {
    const result = await window.electronAPI.updateOPTEEnvironments(url);
    if (result.success) {
      const added = result.added || 0;
      const updated = result.updated || 0;
      const markedOld = result.markedOld || 0;
      alert(`Successfully updated OPTE environments.\n${added} added, ${updated} updated, ${markedOld} marked as OLD.`);
      loadData(); // Refresh the environment list
      setShowOPTEUpdate(false);
    } else {
      throw new Error(result.error || 'Failed to update OPTE environments');
    }
  };

  const handleSaveCustom = async () => {
    if (!customContent.trim()) {
      alert('Please enter some content before saving.');
      return;
    }

    if (!confirm('Are you sure you want to save this custom HOSTS file content? This will replace your current HOSTS file.')) {
      return;
    }

    setIsSavingCustom(true);
    try {
      // Add Custom header if not already present
      let contentToSave = customContent;
      if (!contentToSave.trim().startsWith('# Custom') && !contentToSave.trim().startsWith('#')) {
        contentToSave = `# Custom\n# Environment activated by HOSTY\n#\n\n${contentToSave}`;
      }
      
      const result = await window.electronAPI.saveHostsFile(contentToSave);
      if (result.success) {
        alert('Custom HOSTS file saved successfully!');
        setShowCustomEditor(false);
        setCustomContent('');
        loadData(); // Refresh to update current environment status (will show "Custom")
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSavingCustom(false);
    }
  };

  if (editingEnvironment !== null) {
    return (
      <div className="app">
        <CurrentProfileBar 
          onViewProfile={handleViewProfile} 
          onRefresh={loadData} 
          onOPTEUpdate={() => setShowOPTEUpdate(true)}
        />
        <EnvironmentEditor
          environment={editingEnvironment === 'new' ? null : editingEnvironment}
          onSave={handleSaveEnvironment}
          onCancel={handleCancelEdit}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <CurrentProfileBar 
        onViewProfile={handleViewProfile} 
        onRefresh={loadData} 
        onOPTEUpdate={() => setShowOPTEUpdate(true)}
      />
      <div className="main-content">
        <EnvironmentList
          environments={environments}
          currentEnvironment={currentEnvironment}
          onSelectEnvironment={handleSelectEnvironment}
          onEditEnvironment={handleEditEnvironment}
          onDeleteEnvironment={handleDeleteEnvironment}
          onAddNew={handleAddNew}
          onCustom={handleCustom}
        />
        <div className="content-area">
          <div className="content-header">
            <div className="current-profile-info">
              <span className="current-profile-label">Current Profile:</span>
              <span className="current-profile-name">
                {currentEnvironment === 'Custom' ? 'Custom' : 
                 currentEnvironment === 'DEFAULT' ? 'DEFAULT' :
                 currentEnvironment === 'UNKNOWN' ? 'UNKNOWN' :
                 currentEnvironment || 'UNKNOWN'}
              </span>
            </div>
          </div>
          <div className="content-body">
            <div className="instructions-panel">
              <div className="instructions-title">📝 How to Use HOSTY</div>
              <div className="instructions-content">
                <div className="instruction-item" key="activate">
                  <strong>To activate an environment:</strong> Click on any environment name in the sidebar to activate it and replace your HOSTS file.
                </div>
                <div className="instruction-item" key="create">
                  <strong>To create a new environment:</strong> Click the "+ Add New" button to create a new environment with custom IP addresses and hostnames.
                </div>
                <div className="instruction-item" key="custom">
                  <strong>To use custom content:</strong> Click the "Custom" button to paste and save custom HOSTS file content without creating an environment.
                </div>
                <div className="instruction-item" key="view">
                  <strong>To view current HOSTS file:</strong> Click "View Current HOST" in the top bar to see and edit your current HOSTS file content.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showHostsFile && (
        <div className="modal" onClick={() => setShowHostsFile(false)}>
          <div className="modal-content hosts-file-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Current HOSTS File Content</h2>
              <button className="modal-close" onClick={() => setShowHostsFile(false)}>×</button>
            </div>
            <textarea
              ref={hostsFileTextareaRef}
              className="hosts-file-edit"
              value={editedHostsFileContent}
              onChange={(e) => setEditedHostsFileContent(e.target.value)}
              spellCheck={false}
            />
            <div className="form-actions">
              <button 
                className="btn btn-success" 
                onClick={handleSaveHostsFile}
                disabled={isSavingHostsFile || editedHostsFileContent === hostsFileContent}
              >
                {isSavingHostsFile ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="btn" onClick={() => setShowHostsFile(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomEditor && (
        <div className="modal" onClick={() => setShowCustomEditor(false)}>
          <div className="modal-content hosts-file-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Custom HOSTS File Content</h2>
              <button className="modal-close" onClick={() => setShowCustomEditor(false)}>×</button>
            </div>
            <div className="help-text" style={{ marginBottom: '12px', color: '#666' }}>
              Paste your custom HOSTS file content below. This will not be saved as an environment.
            </div>
            <textarea
              className="hosts-file-edit"
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              placeholder="Paste your custom HOSTS file content here..."
              spellCheck={false}
            />
            <div className="form-actions">
              <button 
                className="btn btn-success" 
                onClick={handleSaveCustom}
                disabled={isSavingCustom || !customContent.trim()}
              >
                {isSavingCustom ? 'Saving...' : 'Save to HOSTS File'}
              </button>
              <button className="btn" onClick={() => setShowCustomEditor(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <OPTEUpdateDialog
        isOpen={showOPTEUpdate}
        onClose={() => setShowOPTEUpdate(false)}
        onUpdate={handleOPTEUpdate}
      />

    </div>
  );
};

export default App;

