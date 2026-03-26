import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function AvailableForms({ onSelectForm }) {
  const [forms, setForms] = useState([]);

  useEffect(() => {
    const fetchActiveForms = async () => {
      const { data } = await supabase
        .from('forms')
        .select('id, title, description')
        .eq('is_active', true);
      setForms(data || []);
    };
    fetchActiveForms();
  }, []);

  return (
    <div>
      <h2>Available Forms</h2>
      <ul>
        {forms.map(form => (
          <li key={form.id} onClick={() => onSelectForm(form)} style={{ cursor: 'pointer' }}>
            <strong>{form.title}</strong> – {form.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
