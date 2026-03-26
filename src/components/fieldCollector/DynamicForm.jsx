import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { saveOffline } from './OfflineStorage'; // we'll define

export default function DynamicForm({ form, onSubmitted }) {
  const [fields, setFields] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    const fetchFields = async () => {
      const { data } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', form.id)
        .order('order_index');
      setFields(data || []);
      setLoading(false);
    };
    fetchFields();
    // Optional: get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, [form.id]);

  const handleChange = (fieldId, value) => {
    setAnswers({ ...answers, [fieldId]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    // Build submission data
    const submissionData = { answers, location };
    // If online, submit directly; else store offline
    if (navigator.onLine) {
      const { error } = await supabase
        .from('form_submissions')
        .insert({
          form_id: form.id,
          collector_id: (await supabase.auth.getUser()).data.user.id,
          data: submissionData,
          location: location ? `POINT(${location[1]} ${location[0]})` : null,
          status: 'pending'
        });
      if (!error) {
        alert('Submitted successfully');
        onSubmitted();
      } else alert('Error: ' + error.message);
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
          {/* location and photo would require more UI, but you can expand later */}
        </div>
      ))}
      <button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</button>
    </form>
  );
}
