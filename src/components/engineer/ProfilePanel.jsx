udate collector profil panel using the import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function ProfilePanel({ userId, role, userProfile, onClose }) {
  const [editing, setEditing]     = useState(false);
  const [name,    setName]        = useState(userProfile?.full_name   || 'Engineer');
  const [phone,   setPhone]       = useState(userProfile?.phone       || '');
  const [dept,    setDept]        = useState(userProfile?.department  || 'Wastewater Engineering');
  const [saving,  setSaving]      = useState(false);
  const [saved,   setSaved]       = useState(false);

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name, phone, department: dept, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('Error saving profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'Role',       val: role ?? 'Engineer',     cls: 'lime'  },
    { label: 'Session',    val: 'Active',               cls: 'green' },
    { label: 'Access',     val: 'Full Edit',            cls: 'green' },
    { label: 'Last Login', val: 'Today',                cls: ''      },
  ];

  return (
    <div className="wd-panel" style={{ '--panel-icon-bg': 'rgba(34,211,238,0.08)', '--panel-icon-border': 'rgba(34,211,238,0.25)' }}>
      <div className="wd-panel-header">
        <div className="wd-panel-icon" style={{ '--panel-icon-bg': 'rgba(34,211,238,0.08)', '--panel-icon-border': 'rgba(34,211,238,0.25)' }}>👤</div>
        <div>
          <div className="wd-panel-title">User Profile</div>
          <div className="wd-panel-sub">Account · Credentials · Preferences</div>
        </div>
        <button className="wd-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="wd-panel-body">
        {/* Avatar */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className="wd-profile-avatar">{initials || '👤'}</div>
          <div className="wd-profile-name">{name}</div>
          <div className="wd-profile-role">{role ?? 'Engineer'}</div>

          {saved && <div className="wd-status ok">✓ Profile saved</div>}
        </div>

        {/* Quick stats */}
        <div className="wd-stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {stats.map(s => (
            <div key={s.label} className={`wd-stat ${s.cls}`}>
              <div className="s-num" style={{ fontSize: 13 }}>{s.val}</div>
              <div className="s-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Profile details */}
        <div className="wd-section">Details</div>
        {!editing ? (
          <>
            {[
              { k: 'Full Name',   v: name },
              { k: 'User ID',     v: userId?.slice(0, 16) + '…' },
              { k: 'Department',  v: dept  },
              { k: 'Phone',       v: phone || '—' },
            ].map(r => (
              <div key={r.k} className="wd-info-row">
                <span className="ir-k">{r.k}</span>
                <span className="ir-v">{r.v}</span>
              </div>
            ))}

            <div className="wd-btn-row">
              <button className="wd-btn wd-btn-ghost" onClick={onClose}>Close</button>
              <button className="wd-btn wd-btn-primary" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
            </div>
          </>
        ) : (
          <>
            <div className="wd-field" style={{ marginBottom: 10 }}>
              <label className="wd-label">Full Name</label>
              <input className="wd-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="wd-field" style={{ marginBottom: 10 }}>
              <label className="wd-label">Department</label>
              <input className="wd-input" value={dept} onChange={e => setDept(e.target.value)} />
            </div>
            <div className="wd-field" style={{ marginBottom: 10 }}>
              <label className="wd-label">Phone</label>
              <input className="wd-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+263 77 …" />
            </div>

            <div className="wd-btn-row">
              <button className="wd-btn wd-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button className="wd-btn wd-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Saving…' : '💾 Save'}
              </button>
            </div>
          </>
        )}

        {/* Sign out */}
        <div className="wd-section" style={{ marginTop: 24 }}>Session</div>
        <button
          className="wd-btn wd-btn-danger"
          style={{ width: '100%' }}
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }}
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}
