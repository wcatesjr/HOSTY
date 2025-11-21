import React, { useState, useEffect } from 'react';
// @ts-ignore - Image asset import
import iconImage from '../../../assets/icon.png';

interface CurrentProfileBarProps {
  onViewProfile: () => void;
  onRefresh: () => void;
  onOPTEUpdate: () => void;
  currentEnvironment?: string | null;
}

const CurrentProfileBar: React.FC<CurrentProfileBarProps> = ({ onViewProfile, onRefresh, onOPTEUpdate }) => {
  const [isReverting, setIsReverting] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    window.electronAPI.getAppVersion().then(version => {
      setAppVersion(version);
    });
  }, []);

  const handleRevertToDefault = async () => {
    if (!confirm('Are you sure you want to revert to the DEFAULT HOSTS file configuration?')) {
      return;
    }

    setIsReverting(true);
    try {
      const result = await window.electronAPI.revertToDefault();
      if (result.success) {
        onRefresh();
        alert('Successfully reverted to DEFAULT configuration');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <div className="current-profile-bar">
      <div className="app-title-container">
        {iconImage && <img src={iconImage} alt="HOSTY" className="app-icon" />}
        <h1 className="app-title">
          HOSTY - Manage your hosts file easily!
          {appVersion && <span className="app-version">v{appVersion}</span>}
        </h1>
      </div>
      <div className="current-profile-buttons">
        <button className="btn btn-primary" onClick={onViewProfile}>
          View Current HOST
        </button>
        <button 
          className="btn btn-opte" 
          onClick={onOPTEUpdate}
          title="On-Prem Test Environments"
        >
          OPTE Update
        </button>
        <button 
          className="btn btn-danger" 
          onClick={handleRevertToDefault}
          disabled={isReverting}
        >
          {isReverting ? 'Reverting...' : 'Restore Default HOSTS'}
        </button>
      </div>
    </div>
  );
};

export default CurrentProfileBar;

