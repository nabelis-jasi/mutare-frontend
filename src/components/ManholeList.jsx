import React from "react";

export default function ManholeList({ manholes, role }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    if (!status) return '#f8f9fa';
    return status.toLowerCase().includes('block') ? '#fff3cd' : '#f8f9fa';
  };

  const getStatusTextColor = (status) => {
    if (!status) return '#666';
    return status.toLowerCase().includes('block') ? '#856404' : '#666';
  };

  return (
    <div className="manhole-list">
      {manholes.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
          No manholes found
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {manholes.map((m) => (
            <li 
              key={m.gid} 
              style={{ 
                padding: '1rem',
                marginBottom: '0.75rem',
                backgroundColor: getStatusColor(m.bloc_stat),
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem', color: '#333' }}>
                  🕳️ {m.manhole_id || 'Unnamed'}
                </strong>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: getStatusColor(m.bloc_stat),
                  color: getStatusTextColor(m.bloc_stat),
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  border: '1px solid',
                  borderColor: getStatusTextColor(m.bloc_stat),
                }}>
                  {m.bloc_stat || 'Normal'}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}>
                <div><strong>Pipe ID:</strong> {m.pipe_id || 'N/A'}</div>
                <div><strong>To MH:</strong> {m.to_mh_id || 'N/A'}</div>
                <div><strong>Depth:</strong> {m.mh_depth || 'N/A'}m</div>
                <div><strong>Pipe Size:</strong> {m.pipe_size || 'N/A'}</div>
                <div><strong>Type:</strong> {m.type || 'N/A'}</div>
                <div><strong>Class:</strong> {m.class || 'N/A'}</div>
                <div><strong>Insp Date:</strong> {formatDate(m.insp_date)}</div>
                <div><strong>Suburb:</strong> {m.suburb_nam || 'N/A'}</div>
              </div>

              {m.remarks && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem',
                  backgroundColor: '#e9ecef',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  fontStyle: 'italic',
                }}>
                  📝 {m.remarks}
                </div>
              )}

              {(role === "field-operator" || role === "engineer") && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <button style={styles.smallButton}>Edit</button>
                  <button style={styles.smallButton}>Update Status</button>
                  <button style={styles.smallButton}>View on Map</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles = {
  smallButton: {
    padding: '0.25rem 0.75rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
};