// public/components/dbconfig.js - Database Configuration with Icon

function renderDBConfig() {
  return `
    <div class="section">
      <h3>🗄️ LOCAL DATABASE</h3>
      <div id="dbStatusContainer" class="db-status-container">
        <div class="db-icon-container">
          <div class="db-icon ${getConnectionStatusClass()}">
            <svg viewBox="0 0 24 24" width="32" height="32">
              <path d="M12 2C8 2 4 3.5 4 6v12c0 2.5 4 4 8 4s8-1.5 8-4V6c0-2.5-4-4-8-4z" 
                    fill="currentColor" opacity="0.3"/>
              <path d="M12 2v20c-4 0-8-1.5-8-4V6c0-2.5 4-4 8-4z" 
                    fill="currentColor" opacity="0.6"/>
              <path d="M12 10c4 0 8-1.5 8-4s-4-4-8-4-8 1.5-8 4 4 4 8 4z" 
                    fill="currentColor" opacity="0.8"/>
              <circle cx="12" cy="10" r="2" fill="#0a1f0a"/>
              <circle cx="12" cy="15" r="1.5" fill="#0a1f0a"/>
            </svg>
            <div class="db-status-dot ${getStatusDotClass()}"></div>
          </div>
          <div class="db-info">
            <div class="db-name" id="dbNameDisplay">PostgreSQL</div>
            <div class="db-status-text" id="dbStatusText">Checking connection...</div>
          </div>
        </div>
        <button id="configureDBBtn" class="db-config-btn">
          <span class="btn-icon">⚙️</span> Configure Database
        </button>
      </div>
    </div>
    
    <!-- Database Configuration Modal -->
    <div id="dbModal" class="modal" style="display:none;">
      <div class="modal-content">
        <div class="modal-header">
          <div class="pgadmin-icon">🐘</div>
          <h3>PostgreSQL Connection Settings</h3>
        </div>
        <div class="modal-body">
          <div class="input-group">
            <label>Host</label>
            <input type="text" id="dbHost" placeholder="localhost" value="localhost">
          </div>
          <div class="input-group">
            <label>Port</label>
            <input type="text" id="dbPort" placeholder="5432" value="5432">
          </div>
          <div class="input-group">
            <label>Username</label>
            <input type="text" id="dbUser" placeholder="postgres">
          </div>
          <div class="input-group">
            <label>Password</label>
            <input type="password" id="dbPassword" placeholder="Enter password">
          </div>
          <div class="input-group">
            <label>Database Name</label>
            <input type="text" id="dbName" placeholder="sewer_management" value="sewer_management">
          </div>
          <div id="dbMessage" class="db-message"></div>
        </div>
        <div class="modal-footer">
          <button id="testDBBtn" class="btn-secondary">
            <span class="btn-icon">🔌</span> Test Connection
          </button>
          <button id="initDBBtn" class="btn-secondary">
            <span class="btn-icon">🚀</span> Initialize
          </button>
          <button id="saveDBBtn" class="btn-primary">
            <span class="btn-icon">💾</span> Save & Connect
          </button>
          <button id="closeDBModal" class="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

function getConnectionStatusClass() {
  // Will be updated dynamically
  return '';
}

function getStatusDotClass() {
  // Will be updated dynamically
  return 'status-unknown';
}

async function checkDBStatus() {
  try {
    const response = await fetch('/api/system/db-status');
    const status = await response.json();
    
    const dbNameSpan = document.getElementById('dbNameDisplay');
    const dbStatusText = document.getElementById('dbStatusText');
    const dbIcon = document.querySelector('.db-icon');
    const statusDot = document.querySelector('.db-status-dot');
    
    if (status.connected) {
      if (dbNameSpan) dbNameSpan.innerHTML = `🐘 ${status.database || 'sewer_management'}`;
      if (dbStatusText) {
        dbStatusText.innerHTML = `✅ Connected to ${status.host}:${status.port}`;
        dbStatusText.style.color = '#28a745';
      }
      if (dbIcon) {
        dbIcon.classList.remove('disconnected', 'unknown');
        dbIcon.classList.add('connected');
      }
      if (statusDot) {
        statusDot.classList.remove('status-unknown', 'status-disconnected');
        statusDot.classList.add('status-connected');
      }
    } else if (status.configured) {
      if (dbStatusText) {
        dbStatusText.innerHTML = `⚠️ Cannot connect to ${status.host}:${status.port}`;
        dbStatusText.style.color = '#ffc107';
      }
      if (dbIcon) {
        dbIcon.classList.remove('connected', 'unknown');
        dbIcon.classList.add('disconnected');
      }
      if (statusDot) {
        statusDot.classList.remove('status-unknown', 'status-connected');
        statusDot.classList.add('status-disconnected');
      }
    } else {
      if (dbStatusText) {
        dbStatusText.innerHTML = '🔌 Not configured - Click to set up';
        dbStatusText.style.color = '#ffaa44';
      }
      if (dbIcon) {
        dbIcon.classList.remove('connected', 'disconnected');
        dbIcon.classList.add('unknown');
      }
      if (statusDot) {
        statusDot.classList.remove('status-connected', 'status-disconnected');
        statusDot.classList.add('status-unknown');
      }
    }
  } catch (error) {
    console.error('Error checking DB status:', error);
  }
}

async function testConnection(config) {
  const response = await fetch('/api/system/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return response.json();
}

async function initializeDatabase(config) {
  const response = await fetch('/api/system/init-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return response.json();
}

async function saveDBConfig(config) {
  const response = await fetch('/api/system/db-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return response.json();
}

async function backupDatabase() {
  const response = await fetch('/api/system/backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
}

async function getBackups() {
  const response = await fetch('/api/system/backups');
  return response.json();
}

function initDBConfig() {
  const configureBtn = document.getElementById('configureDBBtn');
  const modal = document.getElementById('dbModal');
  const closeBtn = document.getElementById('closeDBModal');
  const testBtn = document.getElementById('testDBBtn');
  const initBtn = document.getElementById('initDBBtn');
  const saveBtn = document.getElementById('saveDBBtn');
  const messageDiv = document.getElementById('dbMessage');
  
  if (configureBtn) {
    configureBtn.onclick = () => {
      modal.style.display = 'flex';
      messageDiv.innerHTML = '';
      loadSavedConfigToUI();
    };
  }
  
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
  
  if (testBtn) {
    testBtn.onclick = async () => {
      const config = {
        host: document.getElementById('dbHost').value,
        port: parseInt(document.getElementById('dbPort').value),
        user: document.getElementById('dbUser').value,
        password: document.getElementById('dbPassword').value,
        database: document.getElementById('dbName').value
      };
      
      messageDiv.innerHTML = '<div class="loading-spinner">🔄 Testing connection...</div>';
      const result = await testConnection(config);
      
      if (result.connected) {
        messageDiv.innerHTML = '<div class="success-message">✅ Connection successful! PostgreSQL is ready.</div>';
      } else {
        messageDiv.innerHTML = `<div class="error-message">❌ Connection failed: ${result.error}</div>`;
      }
    };
  }
  
  if (initBtn) {
    initBtn.onclick = async () => {
      const config = {
        host: document.getElementById('dbHost').value,
        port: parseInt(document.getElementById('dbPort').value),
        user: document.getElementById('dbUser').value,
        password: document.getElementById('dbPassword').value,
        database: document.getElementById('dbName').value
      };
      
      if (!confirm('This will create all database tables and extensions (PostGIS). Continue?')) return;
      
      messageDiv.innerHTML = '<div class="loading-spinner">🔄 Initializing database schema...</div>';
      const result = await initializeDatabase(config);
      
      if (result.success) {
        messageDiv.innerHTML = '<div class="success-message">✅ Database initialized successfully! PostGIS is enabled.</div>';
        setTimeout(() => {
          modal.style.display = 'none';
          checkDBStatus();
        }, 2000);
      } else {
        messageDiv.innerHTML = `<div class="error-message">❌ Error: ${result.error}</div>`;
      }
    };
  }
  
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const config = {
        host: document.getElementById('dbHost').value,
        port: parseInt(document.getElementById('dbPort').value),
        user: document.getElementById('dbUser').value,
        password: document.getElementById('dbPassword').value,
        database: document.getElementById('dbName').value
      };
      
      messageDiv.innerHTML = '<div class="loading-spinner">🔄 Saving configuration...</div>';
      const result = await saveDBConfig(config);
      
      if (result.success) {
        messageDiv.innerHTML = '<div class="success-message">✅ Configuration saved! Testing connection...</div>';
        setTimeout(async () => {
          const testResult = await testConnection(config);
          if (testResult.connected) {
            messageDiv.innerHTML = '<div class="success-message">✅ Connected to database! Ready to use.</div>';
            setTimeout(() => {
              modal.style.display = 'none';
              checkDBStatus();
              // Refresh page data
              if (window.refreshData) window.refreshData();
            }, 1500);
          } else {
            messageDiv.innerHTML = `<div class="warning-message">⚠️ Configuration saved but connection failed: ${testResult.error}</div>`;
          }
        }, 500);
      } else {
        messageDiv.innerHTML = `<div class="error-message">❌ Error: ${result.error}</div>`;
      }
    };
  }
  
  // Click outside modal to close
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
  
  // Initial status check
  checkDBStatus();
}

async function loadSavedConfigToUI() {
  try {
    const response = await fetch('/api/system/db-status');
    const status = await response.json();
    
    if (status.configured) {
      document.getElementById('dbHost').value = status.host || 'localhost';
      document.getElementById('dbPort').value = status.port || '5432';
      document.getElementById('dbUser').value = status.user || 'postgres';
      document.getElementById('dbName').value = status.database || 'sewer_management';
      document.getElementById('dbPassword').value = '';
    }
  } catch (error) {
    console.error('Error loading saved config:', error);
  }
}

// Backup functionality
async function initBackupUI() {
  const backupBtn = document.getElementById('backupNowBtn');
  if (backupBtn) {
    backupBtn.onclick = async () => {
      const result = await backupDatabase();
      if (result.success) {
        alert(`✅ Backup created: ${result.backupFile}\nSize: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
        loadBackupsList();
      } else {
        alert(`❌ Backup failed: ${result.error}`);
      }
    };
  }
}

async function loadBackupsList() {
  const backupsList = document.getElementById('backupsList');
  if (!backupsList) return;
  
  const data = await getBackups();
  if (data.backups && data.backups.length > 0) {
    backupsList.innerHTML = data.backups.map(b => `
      <div class="backup-item">
        <span class="backup-name">📁 ${b.name}</span>
        <span class="backup-size">${(b.size / 1024 / 1024).toFixed(2)} MB</span>
        <span class="backup-date">${new Date(b.created).toLocaleString()}</span>
        <button class="restore-backup" data-file="${b.name}">Restore</button>
      </div>
    `).join('');
    
    // Add restore handlers
    document.querySelectorAll('.restore-backup').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Restoring will replace current database. Continue?')) {
          const response = await fetch('/api/system/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ backupFile: btn.dataset.file })
          });
          const result = await response.json();
          if (result.success) {
            alert('✅ Database restored successfully!');
            location.reload();
          } else {
            alert(`❌ Restore failed: ${result.error}`);
          }
        }
      };
    });
  } else {
    backupsList.innerHTML = '<div class="no-backups">No backups found. Click "Backup Now" to create one.</div>';
  }
}

export default {
  render: renderDBConfig,
  init: initDBConfig,
  checkStatus: checkDBStatus,
  initBackup: initBackupUI,
  loadBackups: loadBackupsList
};
