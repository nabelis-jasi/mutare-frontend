// src/components/fieldCollector/DynamicForm.jsx
import React, { useState, useEffect } from 'react';
import api from "../../api/api"; // adjust path
import { saveOffline } from './OfflineStorage';

export default function DynamicForm({ form, userId, onSubmitted }) {
  const [fields, setFields] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await api.get(`/forms/${form.id}/fields`);
        setFields(res.data || []);
      } catch (err) {
        console.error('Error fetching fields', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFields();

    // Get current location if geolocation is available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, [form.id]);

  const handleChange = (fieldId, value) => {
    setAnswers({ ...answers, [fieldId]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const submissionData = { answers, location };

    if (navigator.onLine) {
      try {
        await api.post('/submissions', {
          form_id: form.id,
          collector_id: userId,
          data: submissionData,
          location: location ? { lat: location.lat, lng: location.lng } : null,
          status: 'pending'
        });
        alert('Submitted successfully');
        onSubmitted();
      } catch (err) {
        alert('Error: ' + (err.response?.data?.error || err.message));
      }
    } else {
      // Save offline
      await saveOffline({ form, data: submissionData, location });
      alert('Saved offline. Sync when online.');
      onSubmitted();
    }
    setSubmitting(false);
  };

  if (loading) return <div>Loading form...</div>;

  return (
    <form onSubmit={handleSubmit}>
      {fields.map(field => (
        <div key={field.id}>
          <label>
            {field.label} {field.required && '*'}
          </label>
          {field.field_type === 'text' && (
            <input
              type="text"
              required={field.required}
              value={answers[field.id] || ''}
              onChange={e => handleChange(field.id, e.target.value)}
            />
          )}
          {field.field_type === 'number' && (
            <input
              type="number"
              required={field.required}
              value={answers[field.id] || ''}
              onChange={e => handleChange(field.id, e.target.value)}
            />
          )}
          {field.field_type === 'select' && (
            <select
              required={field.required}
              value={answers[field.id] || ''}
              onChange={e => handleChange(field.id, e.target.value)}
            >
              <option value="">-- Select --</option>
              {field.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
          {field.field_type === 'checkbox' && (
            <input
              type="checkbox"
              checked={answers[field.id] || false}
              onChange={e => handleChange(field.id, e.target.checked)}
            />
          )}
          {/* Additional field types (location, photo) can be added later */}
        </div>
      ))}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
