import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function CollectorForm({ userId }) {
  const [formSchema, setFormSchema] = useState([]);
  const [answers, setAnswers] = useState({});
  const [location, setLocation] = useState(null);

  useEffect(() => {
    const fetchSchema = async () => {
      const { data } = await supabase.from('form_schema').select('*').order('id');
      if (data) setFormSchema(data);
    };
    fetchSchema();
  }, []);

  const getGPS = () => {
    navigator.geolocation.getCurrentPosition(({ coords }) => setLocation({ lat: coords.latitude, lng: coords.longitude }));
  };

  const handleSubmit = async () => {
    if (!location) return alert('Get GPS first!');
    const payload = { user_id: userId, location, answers };
    const { error } = await supabase.from('collector_submissions').insert([payload]);
    if (!error) alert('Saved to Supabase!');
  };

  return (
    <div>
      <button onClick={getGPS}>📍 Get GPS</button>
      {location && <div>Lat: {location.lat}, Lng: {location.lng}</div>}
      {formSchema.map(q => (
        <div key={q.id}>
          <label>{q.label}</label>
          {q.type === 'text' && <input value={answers[q.id] || ''} onChange={e => setAnswers({...answers, [q.id]: e.target.value})} />}
          {q.type === 'select' && (
            <select value={answers[q.id] || ''} onChange={e => setAnswers({...answers, [q.id]: e.target.value})}>
              <option value="">-- Select --</option>
              {q.options.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          )}
        </div>
      ))}
      <button onClick={handleSubmit}>Save Submission</button>
    </div>
  );
}
