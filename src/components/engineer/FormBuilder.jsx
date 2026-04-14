// src/components/engineer/FormBuilder.jsx
import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import api from '../../api/api';

const FIELD_TYPES = [
    { id: 'text', label: 'Text', icon: '📝' },
    { id: 'number', label: 'Number', icon: '🔢' },
    { id: 'select', label: 'Select', icon: '📋' },
    { id: 'checkbox', label: 'Checkbox', icon: '☑️' },
    { id: 'radio', label: 'Radio', icon: '🔘' },
    { id: 'textarea', label: 'Textarea', icon: '✏️' },
    { id: 'date', label: 'Date', icon: '📅' },
    { id: 'location', label: 'Location', icon: '📍' },
    { id: 'photo', label: 'Photo', icon: '📷' },
];

export default function FormBuilder({ form, onSaved, onCancel }) {
    const isNew = !form?.id;
    const [formId, setFormId] = useState(form?.id || null);
    const [schema, setSchema] = useState({ fields: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedField, setSelectedField] = useState(null);
    const [newFieldType, setNewFieldType] = useState('text');
    const [title, setTitle] = useState(form?.title || '');
    const [description, setDescription] = useState(form?.description || '');

    // Fetch existing schema if editing
    useEffect(() => {
        if (formId) {
            fetchSchema();
        } else {
            setSchema({ fields: [] });
            setLoading(false);
        }
    }, [formId]);

    const fetchSchema = async () => {
        try {
            const res = await api.get(`/forms/${formId}/schema`);
            setSchema(res.data);
        } catch (err) {
            console.error('Error fetching schema', err);
            setSchema({ fields: [] });
        } finally {
            setLoading(false);
        }
    };

    const saveForm = async () => {
        setSaving(true);
        try {
            let savedFormId = formId;
            // If new form, create the form metadata first
            if (isNew) {
                const res = await api.post('/forms', { title, description, is_active: true });
                savedFormId = res.data.id;
                setFormId(savedFormId);
            } else {
                await api.put(`/forms/${formId}`, { title, description });
            }
            // Save schema
            await api.put(`/forms/${savedFormId}/schema`, { schema });
            if (onSaved) onSaved(savedFormId);
        } catch (err) {
            console.error('Error saving form', err);
            alert('Failed to save form: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const addField = () => {
        const newField = {
            id: `field_${Date.now()}`,
            type: newFieldType,
            label: `New ${FIELD_TYPES.find(f => f.id === newFieldType)?.label} field`,
            required: false,
            options: newFieldType === 'select' || newFieldType === 'radio' ? ['Option 1'] : undefined,
        };
        setSchema(prev => ({ ...prev, fields: [...prev.fields, newField] }));
        setSelectedField(newField.id);
    };

    const removeField = (id) => {
        setSchema(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));
        if (selectedField === id) setSelectedField(null);
    };

    const updateField = (id, updates) => {
        setSchema(prev => ({
            ...prev,
            fields: prev.fields.map(f => f.id === id ? { ...f, ...updates } : f)
        }));
    };

    const onDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = schema.fields.findIndex(f => f.id === active.id);
            const newIndex = schema.fields.findIndex(f => f.id === over.id);
            setSchema(prev => ({
                ...prev,
                fields: arrayMove(prev.fields, oldIndex, newIndex)
            }));
        }
    };

    const sensors = useSensors(useSensor(PointerSensor));

    if (loading) {
        return (
            <div className="wd-panel" style={{ width: '90vw', maxWidth: '1200px' }}>
                <div className="wd-panel-header">Loading form builder...</div>
            </div>
        );
    }

    return (
        <div className="wd-panel" style={{ width: '90vw', maxWidth: '1200px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="wd-panel-header">
                <div className="wd-panel-icon">📝</div>
                <div>
                    <div className="wd-panel-title">{isNew ? 'Create New Form' : 'Edit Form'}</div>
                    <div className="wd-panel-sub">Drag to reorder fields</div>
                </div>
                <button className="wd-panel-close" onClick={onCancel}>×</button>
            </div>
            <div className="wd-panel-body" style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
                {/* Form metadata */}
                <div style={{ marginBottom: '1rem' }}>
                    <label className="wd-label">Form Title</label>
                    <input
                        type="text"
                        className="wd-input"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g., Manhole Inspection"
                    />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="wd-label">Description (optional)</label>
                    <textarea
                        className="wd-textarea"
                        rows={2}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Describe the purpose of this form"
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Left: Field types */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <h3 className="wd-section">Field Types</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {FIELD_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setNewFieldType(type.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem',
                                        borderRadius: '6px',
                                        background: newFieldType === type.id ? '#e0f2fe' : '#f8fafc',
                                        border: '1px solid #ddd',
                                        cursor: 'pointer',
                                        textAlign: 'left'
                                    }}
                                >
                                    <span>{type.icon}</span> {type.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={addField}
                            style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', background: '#2c7da0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            + Add Field
                        </button>
                    </div>

                    {/* Center: Sortable fields */}
                    <div style={{ flex: 2, minWidth: '300px' }}>
                        <h3 className="wd-section">Form Fields</h3>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                            <SortableContext items={schema.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {schema.fields.map(field => (
                                        <SortableItem key={field.id} id={field.id}>
                                            <div
                                                style={{
                                                    border: selectedField === field.id ? '2px solid #2c7da0' : '1px solid #ddd',
                                                    borderRadius: '8px',
                                                    padding: '0.75rem',
                                                    background: selectedField === field.id ? '#f0f9ff' : 'white',
                                                    cursor: 'grab',
                                                    transition: 'all 0.2s'
                                                }}
                                                onClick={() => setSelectedField(field.id)}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ color: '#999', cursor: 'grab' }}>⋮⋮</span>
                                                        <strong>{field.label}</strong>
                                                        <span style={{ fontSize: '0.7rem', color: '#666' }}>({FIELD_TYPES.find(t => t.id === field.type)?.label})</span>
                                                        {field.required && <span style={{ color: 'red', fontSize: '0.7rem' }}>*</span>}
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                                                        style={{ background: 'none', border: 'none', color: '#e76f51', cursor: 'pointer' }}
                                                    >🗑️</button>
                                                </div>
                                            </div>
                                        </SortableItem>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                        {schema.fields.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>No fields yet. Add one from the left panel.</div>
                        )}
                    </div>

                    {/* Right: Field properties */}
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <h3 className="wd-section">Properties</h3>
                        {selectedField ? (
                            (() => {
                                const field = schema.fields.find(f => f.id === selectedField);
                                if (!field) return null;
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div>
                                            <label className="wd-label">Label</label>
                                            <input
                                                type="text"
                                                className="wd-input"
                                                value={field.label}
                                                onChange={e => updateField(field.id, { label: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="wd-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={field.required}
                                                    onChange={e => updateField(field.id, { required: e.target.checked })}
                                                />
                                                Required
                                            </label>
                                        </div>
                                        {(field.type === 'select' || field.type === 'radio') && (
                                            <div>
                                                <label className="wd-label">Options</label>
                                                {field.options?.map((opt, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                                                        <input
                                                            type="text"
                                                            className="wd-input"
                                                            value={opt}
                                                            onChange={e => {
                                                                const newOpts = [...field.options];
                                                                newOpts[idx] = e.target.value;
                                                                updateField(field.id, { options: newOpts });
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const newOpts = field.options.filter((_, i) => i !== idx);
                                                                updateField(field.id, { options: newOpts });
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: '#e76f51', cursor: 'pointer' }}
                                                        >✕</button>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => updateField(field.id, { options: [...(field.options || []), 'New Option'] })}
                                                    style={{ background: 'none', border: 'none', color: '#2c7da0', cursor: 'pointer', marginTop: '0.25rem' }}
                                                >+ Add option</button>
                                            </div>
                                        )}
                                        {field.type === 'location' && (
                                            <div className="text-gray-500 text-sm">Location picker will be added on map.</div>
                                        )}
                                        {field.type === 'photo' && (
                                            <div className="text-gray-500 text-sm">Photo capture will be integrated.</div>
                                        )}
                                    </div>
                                );
                            })()
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>Select a field to edit its properties</div>
                        )}
                    </div>
                </div>
            </div>
            <div className="wd-panel-footer" style={{ padding: '1rem', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button className="wd-btn wd-btn-secondary" onClick={onCancel}>Cancel</button>
                <button className="wd-btn wd-btn-primary" onClick={saveForm} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Form'}
                </button>
            </div>
        </div>
    );
}
