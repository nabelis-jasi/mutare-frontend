/* Main layout: map left, panel right */
.wd-main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.wd-map-container {
  flex: 2;
  position: relative;
  background: #e9ecef;
}

.wd-panel-container {
  flex: 1;
  min-width: 380px;
  max-width: 480px;
  background: white;
  border-left: 1px solid var(--border, #e0e4e8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Tab bar – box tabs */
.wd-tab-bar {
  display: flex;
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
  padding: 0.5rem 0.75rem 0;
  gap: 0.25rem;
  overflow-x: auto;
  scrollbar-width: thin;
}

.wd-tab {
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-light);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  margin-bottom: -1px;
}
.wd-tab:hover {
  background: #eef2f5;
}
.wd-tab.active {
  color: var(--primary);
  border-color: var(--primary);
  border-bottom-color: white;
  background: white;
  position: relative;
  z-index: 1;
}

/* Panel content */
.wd-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

/* Badge for pending edits */
.badge {
  background: var(--danger, #e76f51);
  color: white;
  border-radius: 12px;
  padding: 0.1rem 0.4rem;
  font-size: 0.7rem;
  margin-left: 0.3rem;
}
