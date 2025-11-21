import React, { useState } from 'react';
import { Environment, EnvironmentCategory } from '../../shared/types';

interface EnvironmentListProps {
  environments: Environment[];
  currentEnvironment: string | null;
  onSelectEnvironment: (name: string) => void;
  onEditEnvironment: (name: string) => void;
  onDeleteEnvironment: (name: string) => void;
  onAddNew: () => void;
  onCustom: () => void;
}

const EnvironmentList: React.FC<EnvironmentListProps> = ({
  environments,
  currentEnvironment,
  onSelectEnvironment,
  onEditEnvironment,
  onDeleteEnvironment,
  onAddNew,
  onCustom
}) => {
  const [categoryFilter, setCategoryFilter] = useState<EnvironmentCategory | 'All'>('All');

  // Filter environments based on selected category
  const filteredEnvironments = categoryFilter === 'All' 
    ? environments 
    : environments.filter(env => env.category === categoryFilter);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Environments</div>
        <div className="sidebar-header-buttons">
          <button className="btn btn-success" onClick={onAddNew}>
            + Add New
          </button>
          <button className="btn btn-primary" onClick={onCustom}>
            Custom
          </button>
        </div>
        <div className="category-filter" style={{ marginTop: '12px' }}>
          <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Filter by Category:</label>
          <select
            className="form-input"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as EnvironmentCategory | 'All')}
            style={{ width: '100%', fontSize: '13px', padding: '6px' }}
          >
            <option value="All">All</option>
            <option value="Personal">Personal</option>
            <option value="On-Prem Test Environment">On-Prem Test Environments</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div className="environment-list">
        {filteredEnvironments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">
              {environments.length === 0 
                ? 'No environments yet' 
                : `No environments found for category "${categoryFilter}"`}
            </div>
            {environments.length === 0 && (
              <button className="btn btn-success" onClick={onAddNew}>
                Create Your First Environment
              </button>
            )}
          </div>
        ) : (
          filteredEnvironments.map((env) => (
            <div
              key={env.name}
              className={`environment-item ${currentEnvironment === env.name ? 'active' : ''} ${env.isOld ? 'environment-old' : ''}`}
              onClick={() => onSelectEnvironment(env.name)}
            >
              <div className="environment-item-info">
                <span className="environment-item-name">
                  {env.name}
                  {env.isOld && <span className="old-badge">OLD</span>}
                </span>
                <span className="environment-item-category">{env.category || 'Other'}</span>
              </div>
              <div className="environment-item-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="icon-btn"
                  onClick={() => onEditEnvironment(env.name)}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  className="icon-btn"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${env.name}"?`)) {
                      onDeleteEnvironment(env.name);
                    }
                  }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EnvironmentList;

