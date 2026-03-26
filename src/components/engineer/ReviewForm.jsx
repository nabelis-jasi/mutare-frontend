import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function ReviewForm({ submissionId }) {
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    const fetchSubmission = async () => {
      const { data } = await supabase.from('collector_submissions').select('*').eq('id', submissionId).single();
      if (data) {
        setSubmission(data);
        setAnswers(data.answers);
      }
    };
    fetchSubmission();
  }, [submissionId]);

  const handleSave = async () => {
    await supabase.from('collector_submissions').update({ answers }).eq('id', submissionId);
    alert('Cleaned answers saved!');
  };

  if (!submission) return <div>Loading…</div>;

  return (
    <div>
      <h3>Engineer Cleaning Form</h3>
      <div>GPS (read-only): Lat {submission.location.lat}, Lng {submission.location.lng}</div>
      {Object.entries(answers).map(([qid, val]) => (
        <div key={qid}>
          <label>Question {qid}</label>
          <input value={val} onChange={e => setAnswers({...answers, [qid]: e.target.value})} />
        </div>
      ))}
      <button onClick={handleSave}>Save Cleaned Answers</button>
    </div>
  );
}
