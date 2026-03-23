import React, { useState } from 'react';
import MapView from './MapView';  // MapView now lives alongside dashboard components
import DataEditor from './DataEditor';
import ShapefileUploader from './ShapefileUploader';
import DataSync from './DataSync';
import FlagManager from './FlagManager';

export default function EngineerDashboard({ manholes, pipes, userId, role, onDataRefresh }) {
  const [activePanel, setActivePanel] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const handleFeatureClick = (feature) => {
    setSelectedFeature(feature);
    setActivePanel('editor');
  };

  const togglePanel = (panel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const tools = [
    { id: 'editor',   icon: '✏️', label: 'Edit Records',     color: '#4f6ef7', shortcut: 'E' },
    { id: 'uploader', icon: '📤', label: 'Upload Shapefile', color: '#22c55e', shortcut: 'U' },
    { id: 'sync',     icon: '🔄', label: 'Sync Data',        color: '#0ea5e9', shortcut: 'S' },
    { id: 'flags',    icon: '🏁', label: 'Manage Flags',     color: '#f59e0b', shortcut: 'F' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@400;600;700;800&display=swap');

        :root {
          --bg-base:     #0d1117;
          --bg-surface:  #161b22;
          --bg-raised:   #1c2128;
          --bg-overlay:  #21262d;
          --border:      rgba(139,148,158,0.15);
          --border-hi:   rgba(139,148,158,0.3);
          --text-pri:    #e6edf3;
          --text-sec:    #8b949e;
          --text-dim:    #484f58;
          --accent-blue: #4f6ef7;
          --accent-green:#22c55e;
          --accent-sky:  #0ea5e9;
          --accent-amber:#f59e0b;
          --accent-red:  #f85149;
          --glow-blue:   rgba(79,110,247,0.18);
          --glow-green:  rgba(34,197,94,0.18);
          --glow-amber:  rgba(245,158,11,0.18);
          --radius-sm:   6px;
          --radius-md:   10px;
          --radius-lg:   14px;
          --font-sans:   'Syne', sans-serif;
          --font-mono:   'JetBrains Mono', monospace;
          --panel-w:     400px;
          --toolbar-h:   56px;
        }

        .eng-root {
          position: relative;
          height: 100%;
          width: 100%;
          font-family: var(--font-sans);
          background: var(--bg-base);
          overflow: hidden;
        }

        /* ── TOP BAR ── */
        .eng-topbar {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: var(--toolbar-h);
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 12px;
          z-index: 1100;
          backdrop-filter: blur(12px);
        }

        .eng-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .eng-brand-icon {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, var(--accent-blue), var(--accent-sky));
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px;
        }

        .eng-brand-text {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-pri);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .eng-brand-sub {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--text-sec);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .eng-divider { width: 1px; height: 28px; background: var(--border); }

        .eng-stats-row {
          display: flex;
          gap: 4px;
          flex: 1;
        }

        .eng-stat-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: var(--bg-raised);
          border: 1px solid var(--border);
          border-radius: 20px;
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-sec);
          white-space: nowrap;
        }

        .eng-stat-chip .dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--accent-green);
          box-shadow: 0 0 6px var(--accent-green);
          animation: pulse 2s infinite;
        }

        .eng-stat-chip .dot.amber { background: var(--accent-amber); box-shadow: 0 0 6px var(--accent-amber); }
        .eng-stat-chip .dot.blue  { background: var(--accent-blue);  box-shadow: 0 0 6px var(--accent-blue);  }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        .eng-role-badge {
          margin-left: auto;
          padding: 4px 12px;
          background: linear-gradient(135deg, var(--glow-blue), rgba(14,165,233,0.12));
          border: 1px solid rgba(79,110,247,0.3);
          border-radius: 20px;
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--accent-blue);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          flex-shrink: 0;
        }

        /* ── MAP AREA ── */
        .eng-map-wrap {
          position: absolute;
          top: var(--toolbar-h);
          left: 0;
          right: 0;
          bottom: 0;
        }

        /* ── TOOL RAIL ── */
        .eng-tool-rail {
          position: absolute;
          top: calc(var(--toolbar-h) + 16px);
          left: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 1050;
        }

        .eng-tool-btn {
          display: flex;
          align-items: center;
          gap: 0;
          width: 44px;
          height: 44px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.18s ease;
          overflow: hidden;
          position: relative;
          color: var(--text-sec);
          font-family: var(--font-sans);
        }

        .eng-tool-btn:hover {
          width: 160px;
          border-color: var(--border-hi);
          background: var(--bg-raised);
          color: var(--text-pri);
        }

        .eng-tool-btn.active {
          width: 160px;
          border-color: var(--btn-color, var(--accent-blue));
          background: var(--bg-raised);
          color: var(--text-pri);
          box-shadow: 0 0 0 1px var(--btn-color, var(--accent-blue)),
                      0 4px 16px rgba(0,0,0,0.3);
        }

        .eng-tool-btn .btn-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          flex-shrink: 0;
        }

        .eng-tool-btn .btn-label {
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          transform: translateX(-4px);
          transition: all 0.18s ease;
          letter-spacing: 0.02em;
        }

        .eng-tool-btn:hover .btn-label,
        .eng-tool-btn.active .btn-label {
          opacity: 1;
          transform: translateX(0);
        }

        .eng-tool-btn .btn-accent-bar {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 2px;
          background: var(--btn-color, var(--accent-blue));
          opacity: 0;
          transition: opacity 0.18s;
          border-radius: 0 2px 2px 0;
        }

        .eng-tool-btn.active .btn-accent-bar { opacity: 1; }

        /* ── PANEL ── */
        .eng-panel {
          position: absolute;
          top: calc(var(--toolbar-h) + 16px);
          right: 16px;
          width: var(--panel-w);
          max-height: calc(100% - var(--toolbar-h) - 32px);
          display: flex;
          flex-direction: column;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px var(--border);
          z-index: 1050;
          overflow: hidden;
          animation: panelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes panelIn {
          from { opacity: 0; transform: translateX(16px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }

        .eng-panel-header {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          background: var(--bg-raised);
        }

        .eng-panel-header-icon {
          width: 30px; height: 30px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
          background: var(--panel-color-bg, var(--glow-blue));
          border: 1px solid var(--panel-color-border, rgba(79,110,247,0.3));
        }

        .eng-panel-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-pri);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .eng-panel-sub {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--text-sec);
          margin-top: 1px;
        }

        .eng-panel-close {
          margin-left: auto;
          width: 26px; height: 26px;
          border-radius: 6px;
          background: var(--bg-overlay);
          border: 1px solid var(--border);
          color: var(--text-sec);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .eng-panel-close:hover {
          background: var(--accent-red);
          border-color: var(--accent-red);
          color: white;
        }

        .eng-panel-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px;
          scrollbar-width: thin;
          scrollbar-color: var(--bg-overlay) transparent;
        }

        /* ── FORM CONTROLS ── */
        .eng-label {
          display: block;
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--text-sec);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 6px;
          margin-top: 14px;
        }
        .eng-label:first-child { margin-top: 0; }

        .eng-input, .eng-select, .eng-textarea {
          width: 100%;
          padding: 8px 12px;
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-pri);
          font-size: 13px;
          font-family: var(--font-sans);
          outline: none;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }

        .eng-input:focus, .eng-select:focus, .eng-textarea:focus {
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 3px var(--glow-blue);
        }

        .eng-textarea { resize: vertical; min-height: 70px; }

        .eng-select option { background: var(--bg-surface); }

        /* ── BUTTONS ── */
        .eng-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 16px;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 700;
          font-family: var(--font-sans);
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.15s;
          text-transform: uppercase;
        }

        .eng-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .eng-btn-primary {
          background: var(--accent-blue);
          color: white;
          box-shadow: 0 4px 12px rgba(79,110,247,0.3);
        }
        .eng-btn-primary:hover:not(:disabled) {
          background: #6480f9;
          box-shadow: 0 6px 20px rgba(79,110,247,0.45);
          transform: translateY(-1px);
        }

        .eng-btn-success {
          background: var(--accent-green);
          color: #052e16;
          box-shadow: 0 4px 12px rgba(34,197,94,0.3);
        }
        .eng-btn-success:hover:not(:disabled) {
          filter: brightness(1.1);
          box-shadow: 0 6px 20px rgba(34,197,94,0.45);
          transform: translateY(-1px);
        }

        .eng-btn-danger {
          background: var(--accent-red);
          color: white;
          box-shadow: 0 4px 12px rgba(248,81,73,0.3);
        }
        .eng-btn-danger:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .eng-btn-ghost {
          background: var(--bg-overlay);
          color: var(--text-sec);
          border: 1px solid var(--border);
        }
        .eng-btn-ghost:hover:not(:disabled) {
          background: var(--bg-raised);
          color: var(--text-pri);
          border-color: var(--border-hi);
        }

        .eng-btn-amber {
          background: var(--accent-amber);
          color: #1c1000;
          box-shadow: 0 4px 12px rgba(245,158,11,0.3);
        }

        .eng-btn-row {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        .eng-btn-row .eng-btn { flex: 1; }

        /* ── INFO ROW / STAT CARD ── */
        .eng-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 16px;
        }

        .eng-stat-card {
          background: var(--bg-raised);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 12px;
          text-align: center;
        }

        .eng-stat-card .sc-num {
          font-size: 22px;
          font-weight: 800;
          font-family: var(--font-mono);
          color: var(--text-pri);
          line-height: 1;
        }

        .eng-stat-card .sc-label {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--text-sec);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 4px;
        }

        .eng-stat-card.green { border-color: rgba(34,197,94,0.3); }
        .eng-stat-card.green .sc-num { color: var(--accent-green); }
        .eng-stat-card.amber { border-color: rgba(245,158,11,0.3); }
        .eng-stat-card.amber .sc-num { color: var(--accent-amber); }
        .eng-stat-card.red   { border-color: rgba(248,81,73,0.3); }
        .eng-stat-card.red   .sc-num { color: var(--accent-red); }
        .eng-stat-card.blue  { border-color: rgba(79,110,247,0.3); }
        .eng-stat-card.blue  .sc-num { color: var(--accent-blue); }

        /* ── INFO ROWS ── */
        .eng-info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
          font-size: 12px;
        }
        .eng-info-row:last-child { border-bottom: none; }
        .eng-info-row .ir-label { color: var(--text-sec); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; }
        .eng-info-row .ir-value { color: var(--text-pri); font-weight: 600; }

        /* ── PROGRESS ── */
        .eng-progress-wrap {
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 99px;
          height: 6px;
          overflow: hidden;
          margin: 12px 0;
        }

        .eng-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-blue), var(--accent-sky));
          border-radius: 99px;
          transition: width 0.4s ease;
          box-shadow: 0 0 8px rgba(79,110,247,0.6);
        }

        /* ── STATUS CHIP ── */
        .eng-status {
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-family: var(--font-mono);
          text-align: center;
          margin: 8px 0;
        }
        .eng-status.ok   { background: rgba(34,197,94,0.1);  border: 1px solid rgba(34,197,94,0.3);  color: var(--accent-green); }
        .eng-status.err  { background: rgba(248,81,73,0.1);  border: 1px solid rgba(248,81,73,0.3);  color: var(--accent-red);   }
        .eng-status.info { background: rgba(79,110,247,0.08);border: 1px solid rgba(79,110,247,0.2); color: var(--accent-blue);  }

        /* ── FLAG ITEM ── */
        .eng-flag-item {
          background: var(--bg-raised);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 12px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .eng-flag-item:hover { border-color: var(--border-hi); background: var(--bg-overlay); }
        .eng-flag-item.selected { border-color: var(--accent-amber); box-shadow: 0 0 0 1px var(--accent-amber), 0 4px 16px var(--glow-amber); }
        .eng-flag-item.resolved { border-color: rgba(34,197,94,0.3); }

        .eng-flag-item .fi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .eng-flag-item .fi-type { font-size: 11px; font-weight: 700; color: var(--text-pri); text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 6px; }
        .eng-flag-item .fi-id   { font-size: 10px; font-family: var(--font-mono); color: var(--text-sec); }
        .eng-flag-item .fi-reason { font-size: 12px; color: var(--text-sec); font-style: italic; margin-top: 4px; }
        .eng-flag-item .fi-date   { font-size: 10px; font-family: var(--font-mono); color: var(--text-dim); margin-top: 6px; }

        .sev-badge {
          font-size: 9px;
          font-family: var(--font-mono);
          padding: 2px 7px;
          border-radius: 99px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }
        .sev-high   { background: rgba(248,81,73,0.15);  color: var(--accent-red);   border: 1px solid rgba(248,81,73,0.3);  }
        .sev-medium { background: rgba(245,158,11,0.15); color: var(--accent-amber); border: 1px solid rgba(245,158,11,0.3); }
        .sev-low    { background: rgba(79,110,247,0.1);  color: var(--accent-blue);  border: 1px solid rgba(79,110,247,0.2); }
        .sev-resolved { background: rgba(34,197,94,0.1); color: var(--accent-green); border: 1px solid rgba(34,197,94,0.3); }

        /* ── FILTER TABS ── */
        .eng-filter-tabs {
          display: flex;
          gap: 4px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-raised);
          flex-shrink: 0;
        }

        .eng-tab {
          padding: 5px 12px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 600;
          font-family: var(--font-mono);
          cursor: pointer;
          border: 1px solid transparent;
          color: var(--text-sec);
          background: transparent;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          transition: all 0.15s;
        }
        .eng-tab:hover { color: var(--text-pri); background: var(--bg-overlay); }
        .eng-tab.active { background: var(--bg-overlay); border-color: var(--border-hi); color: var(--text-pri); }

        /* ── ACTION PANEL ── */
        .eng-action-panel {
          border-top: 1px solid var(--border);
          padding: 14px 16px;
          background: var(--bg-raised);
          flex-shrink: 0;
        }
        .eng-action-panel .ap-heading {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--text-sec);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 10px;
        }

        /* ── FIELD EDITOR ── */
        .eng-field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        /* ── UPLOAD DROP ── */
        .eng-drop-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius-md);
          padding: 28px 16px;
          text-align: center;
          color: var(--text-sec);
          cursor: pointer;
          transition: all 0.2s;
          background: var(--bg-base);
          margin-bottom: 12px;
        }
        .eng-drop-zone:hover, .eng-drop-zone.has-file {
          border-color: var(--accent-green);
          background: rgba(34,197,94,0.04);
          color: var(--text-pri);
        }
        .eng-drop-zone .dz-icon { font-size: 28px; margin-bottom: 8px; }
        .eng-drop-zone .dz-text { font-size: 12px; font-weight: 600; }
        .eng-drop-zone .dz-sub  { font-size: 10px; font-family: var(--font-mono); color: var(--text-dim); margin-top: 4px; }

        /* ── SYNC OPTION GRID ── */
        .eng-sync-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 14px;
        }

        .eng-sync-opt {
          padding: 10px 12px;
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-sec);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .eng-sync-opt:hover { border-color: var(--border-hi); color: var(--text-pri); }
        .eng-sync-opt.active {
          border-color: var(--accent-blue);
          background: var(--glow-blue);
          color: var(--text-pri);
          box-shadow: 0 0 0 1px var(--accent-blue);
        }
        .eng-sync-opt input { display: none; }

        /* ── HISTORY ── */
        .eng-history-item {
          padding: 8px 10px;
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          margin-bottom: 6px;
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--text-sec);
        }
        .eng-history-item .hi-time { color: var(--text-dim); margin-bottom: 2px; }
        .eng-history-item .hi-detail { color: var(--text-sec); }

        /* ── SECTION HEADER ── */
        .eng-section-head {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin: 16px 0 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .eng-section-head::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .eng-section-head:first-child { margin-top: 0; }

        /* ── RESOLVED NOTICE ── */
        .eng-resolved-notice {
          text-align: center;
          padding: 14px;
          background: rgba(34,197,94,0.05);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: var(--radius-md);
          color: var(--accent-green);
          font-size: 12px;
          font-weight: 600;
        }
        .eng-resolved-notice p { color: var(--text-sec); font-size: 11px; font-family: var(--font-mono); margin-top: 4px; }
      `}</style>

      <div className="eng-root">
        {/* TOP BAR */}
        <div className="eng-topbar">
          <div className="eng-brand">
            <div className="eng-brand-icon">🗺️</div>
            <div>
              <div className="eng-brand-text">GIS Command</div>
              <div className="eng-brand-sub">Wastewater Network</div>
            </div>
          </div>

          <div className="eng-divider" />

          <div className="eng-stats-row">
            <div className="eng-stat-chip">
              <span className="dot" /> {manholes?.length ?? 0} Manholes
            </div>
            <div className="eng-stat-chip">
              <span className="dot blue" /> {pipes?.length ?? 0} Pipelines
            </div>
            <div className="eng-stat-chip">
              <span className="dot amber" /> Live
            </div>
          </div>

          <div className="eng-role-badge">{role ?? 'Engineer'}</div>
        </div>

        {/* MAP */}
        <div className="eng-map-wrap">
          <MapView
            manholes={manholes}
            pipes={pipes}
            role={role}
            userId={userId}
            onFeatureClick={handleFeatureClick}
          />
        </div>

        {/* TOOL RAIL */}
        <div className="eng-tool-rail">
          {tools.map(t => (
            <button
              key={t.id}
              className={`eng-tool-btn${activePanel === t.id ? ' active' : ''}`}
              style={{ '--btn-color': t.color }}
              onClick={() => togglePanel(t.id)}
              title={t.label}
            >
              <div className="btn-accent-bar" />
              <span className="btn-icon">{t.icon}</span>
              <span className="btn-label">{t.label}</span>
            </button>
          ))}
        </div>

        {/* PANELS */}
        {activePanel === 'editor' && (
          <DataEditor
            feature={selectedFeature}
            onSave={() => { setActivePanel(null); onDataRefresh(); }}
            onCancel={() => setActivePanel(null)}
          />
        )}
        {activePanel === 'uploader' && (
          <ShapefileUploader
            onUploadComplete={() => { setActivePanel(null); onDataRefresh(); }}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === 'sync' && (
          <DataSync
            userId={userId}
            onSyncComplete={() => { onDataRefresh(); }}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === 'flags' && (
          <FlagManager
            onFlagManaged={() => { onDataRefresh(); }}
            onClose={() => setActivePanel(null)}
          />
        )}
      </div>
    </>
  );
}
