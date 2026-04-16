const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(app.getPath('userData'), 'outbox.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation TEXT,   -- 'INSERT', 'UPDATE', 'DELETE'
    table_name TEXT,
    data TEXT,        -- JSON string
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT 0
  )
`);

function queueLog(operation, tableName, data) {
  const stmt = db.prepare(`INSERT INTO outbox (operation, table_name, data) VALUES (?, ?, ?)`);
  stmt.run(operation, tableName, JSON.stringify(data));
}

async function syncToPostgres(pgClient) {
  const unsynced = db.prepare(`SELECT * FROM outbox WHERE synced = 0`).all();
  for (const row of unsynced) {
    try {
      if (row.table_name === 'job_logs') {
        if (row.operation === 'INSERT') {
          await pgClient.query('INSERT INTO job_logs (data) VALUES ($1)', [row.data]);
        }
        // handle UPDATE/DELETE similarly
      }
      db.prepare(`UPDATE outbox SET synced = 1 WHERE id = ?`).run(row.id);
    } catch (err) {
      console.error('Sync failed for row', row.id, err);
    }
  }
}
