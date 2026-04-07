// src/components/fieldCollector/AvailableForms.jsx
import React, { useEffect, useState } from 'react';
import api from "../../api/api"; // adjust path

export default function AvailableForms({ onSelectForm }) {
  const [forms, setForms] = useState([]);

  useEffect(() => {
    const fetchActiveForms = async () => {
      try {
        const res = await api.get('/forms');
        // Filter only active forms (is_active === true)
        const activeForms = (res.data || []).filter(f => f.is_active === true);
        setForms(activeForms);
      } catch (err) {
        console.error('Error fetching forms', err);
      }
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
