import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function FormsList({ onSelectForm, onNewForm }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setForms(data);
    setLoading(false);
  };

  const toggleActive = async (id, currentActive) => {
    await supabase
      .from('forms')
      .update({ is_active: !currentActive })
      .eq('id', id);
    fetchForms();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={onNewForm}>+ Create New Form</button>
      <ul>
        {forms.map(form => (
          <li key={form.id}>
            <strong>{form.title}</strong>
            <button onClick={() => onSelectForm(form)}>Edit</button>
            <button onClick={() => toggleActive(form.id, form.is_active)}>
              {form.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
