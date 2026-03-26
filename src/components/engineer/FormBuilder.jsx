import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function FormBuilder() {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    // Load saved schema
    const fetchSchema = async () => {
      const { data } = await supabase.from('form_schema').select('*').order('id');
      if (data) setQuestions(data);
    };
    fetchSchema();
  }, []);

  const addQuestion = () => setQuestions(prev => [...prev, { type:'text', label:'', options:[], required:false }]);
  
  const saveSchema = async () => {
    await supabase.from('form_schema').delete(); // remove old schema
    await supabase.from('form_schema').insert(questions); // insert current schema
    alert('Schema saved to Supabase!');
  };

  return (
    <div>
      <h3>Engineer Form Builder</h3>
      {questions.map((q, i) => (
        <div key={i}>
          <input placeholder="Label" value={q.label} onChange={e => {
            const newQ = [...questions]; newQ[i].label = e.target.value; setQuestions(newQ);
          }} />
          <select value={q.type} onChange={e => {
            const newQ = [...questions]; newQ[i].type = e.target.value; setQuestions(newQ);
          }}>
            <option value="text">Text</option>
            <option value="select">Dropdown</option>
          </select>
          {q.type === 'select' && (
            <input placeholder="Options comma separated" value={q.options.join(',')} onChange={e => {
              const newQ = [...questions]; newQ[i].options = e.target.value.split(','); setQuestions(newQ);
            }} />
          )}
        </div>
      ))}
      <button onClick={addQuestion}>+ Add Question</button>
      <button onClick={saveSchema}>Save to Supabase</button>
    </div>
  );
}
