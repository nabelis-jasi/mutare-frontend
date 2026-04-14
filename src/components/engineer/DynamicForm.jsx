import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import api from '../../api/api';

export default function DynamicForm({ formId, userId, onSubmitSuccess, onCancel }) {
    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { control, handleSubmit, formState: { errors } } = useForm();

    useEffect(() => {
        const fetchSchema = async () => {
            const res = await api.get(`/forms/${formId}/schema`);
            setSchema(res.data);
            setLoading(false);
        };
        fetchSchema();
    }, [formId]);

    const onSubmit = async (data) => {
        setSubmitting(true);
        try {
            const payload = {
                form_id: formId,
                collector_id: userId,
                data: data,
                status: 'pending'
            };
            await api.post('/submissions', payload);
            if (onSubmitSuccess) onSubmitSuccess();
        } catch (err) {
            alert('Submission failed: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-4">Loading form...</div>;
    if (!schema) return <div className="p-4">Form not found</div>;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Fill Form</h2>
                    <button onClick={onCancel} className="text-gray-500">✕</button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {schema.fields.map(field => (
                        <div key={field.id} className="border-b pb-3">
                            <label className="block font-medium mb-1">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            {field.type === 'text' && (
                                <Controller
                                    name={field.id}
                                    control={control}
                                    rules={{ required: field.required ? 'This field is required' : false }}
                                    render={({ field: { onChange, value } }) => (
                                        <input type="text" className="w-full border rounded px-2 py-1" onChange={onChange} value={value || ''} />
                                    )}
                                />
                            )}
                            {field.type === 'number' && (
                                <Controller
                                    name={field.id}
                                    control={control}
                                    rules={{ required: field.required }}
                                    render={({ field: { onChange, value } }) => (
                                        <input type="number" className="w-full border rounded px-2 py-1" onChange={onChange} value={value || ''} />
                                    )}
                                />
                            )}
                            {field.type === 'textarea' && (
                                <Controller
                                    name={field.id}
                                    control={control}
                                    rules={{ required: field.required }}
                                    render={({ field: { onChange, value } }) => (
                                        <textarea rows={3} className="w-full border rounded px-2 py-1" onChange={onChange} value={value || ''} />
                                    )}
                                />
                            )}
                            {field.type === 'select' && (
                                <Controller
                                    name={field.id}
                                    control={control}
                                    rules={{ required: field.required }}
                                    render={({ field: { onChange, value } }) => (
                                        <select className="w-full border rounded px-2 py-1" onChange={onChange} value={value || ''}>
                                            <option value="">-- Select --</option>
                                            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    )}
                                />
                            )}
                            {field.type === 'radio' && (
                                <Controller
                                    name={field.id}
                                    control={control}
                                    rules={{ required: field.required }}
                                    render={({ field: { onChange, value } }) => (
                                        <div className="space-y-1">
                                            {field.options?.map(opt => (
                                                <label key={opt} className="block">
                                                    <input type="radio" value={opt} checked={value === opt} onChange={() => onChange(opt)} className="mr-2" />
                                                    {opt}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                />
                            )}
                            {field.type === 'checkbox' && (
                                <Controller
                                    name={field.id}
                                    control={control}
                                    render={({ field: { onChange, value } }) => (
                                        <label className="flex items-center">
                                            <input type="checkbox" checked={value || false} onChange={e => onChange(e.target.checked)} className="mr-2" />
                                            Check this box
                                        </label>
                                    )}
                                />
                            )}
                            {field.type === 'date' && (
                                <Controller
                                    name={field.id}
                                    control={control}
                                    rules={{ required: field.required }}
                                    render={({ field: { onChange, value } }) => (
                                        <input type="date" className="w-full border rounded px-2 py-1" onChange={onChange} value={value || ''} />
                                    )}
                                />
                            )}
                            {field.type === 'location' && (
                                <div className="text-gray-500">Location picker coming soon</div>
                            )}
                            {field.type === 'photo' && (
                                <div className="text-gray-500">Photo upload coming soon</div>
                            )}
                            {errors[field.id] && <p className="text-red-500 text-sm mt-1">{errors[field.id].message}</p>}
                        </div>
                    ))}
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
                        <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            {submitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
