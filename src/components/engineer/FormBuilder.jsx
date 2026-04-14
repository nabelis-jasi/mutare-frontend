// src/components/engineer/FormBuilder.jsx
import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import api from '../../api/api';

const FIELD_TYPES = [
    { id: 'text', label: 'Text', icon: '📝', hasOptions: false, hasAdvanced: true },
    { id: 'number', label: 'Number', icon: '🔢', hasOptions: false, hasAdvanced: true },
    { id: 'select', label: 'Select', icon: '📋', hasOptions: true, hasAdvanced: true },
    { id: 'checkbox', label: 'Checkbox', icon: '☑️', hasOptions: false, hasAdvanced: false },
    { id: 'radio', label: 'Radio', icon: '🔘', hasOptions: true, hasAdvanced: true },
    { id: 'textarea', label: 'Textarea', icon: '✏️', hasOptions: false, hasAdvanced: true },
    { id: 'date', label: 'Date', icon: '📅', hasOptions: false, hasAdvanced: true },
    { id: 'location', label: 'Location', icon: '📍', hasOptions: false, hasAdvanced: false },
    { id: 'photo', label: 'Photo', icon: '📷', hasOptions: false, hasAdvanced: false },
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

    // For possible answers import/export
    const [csvFile, setCsvFile] = useState(null);

    useEffect(() => {
        if (formId) fetchSchema();
        else { setSchema({ fields: [] }); setLoading(false); }
    }, [formId]);

    const fetchSchema = async () => {
        try {
            const res = await api.get(`/forms/${formId}/schema`);
            setSchema(res.data);
        } catch (err) {
            console.error(err);
            setSchema({ fields: [] });
        } finally {
            setLoading(false);
        }
    };

    const saveForm = async () => {
        setSaving(true);
        try {
            let savedFormId = formId;
            if (isNew) {
                const res = await api.post('/forms', { title, description, is_active: true });
                savedFormId = res.data.id;
                setFormId(savedFormId);
            } else {
                await api.put(`/forms/${formId}`, { title, description });
            }
            await api.put(`/forms/${savedFormId}/schema`, { schema });
            if (onSaved) onSaved(savedFormId);
        } catch (err) {
            alert('Save failed: ' + (err.response?.data?.error || err.message));
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
            options: (newFieldType === 'select' || newFieldType === 'radio') ? ['Option 1'] : undefined,
            possible_answers: (newFieldType === 'select' || newFieldType === 'radio') ? ['Option 1'] : undefined,
            default: '',
            min: '',
            max: '',
            regex: '',
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
            setSchema(prev => ({ ...prev, fields: arrayMove(prev.fields, oldIndex, newIndex) }));
        }
    };

    // Possible answers helpers
    const addOption = (fieldId) => {
        const field = schema.fields.find(f => f.id === fieldId);
        if (!field) return;
        const newOptions = [...(field.options || []), 'New Option'];
        updateField(fieldId, { options: newOptions, possible_answers: newOptions });
    };

    const removeOption = (fieldId, idx) => {
        const field = schema.fields.find(f => f.id === fieldId);
        if (!field) return;
        const newOptions = field.options.filter((_, i) => i !== idx);
        updateField(fieldId, { options: newOptions, possible_answers: newOptions });
    };

    const updateOption = (fieldId, idx, value) => {
        const field = schema.fields.find(f => f.id === fieldId);
        if (!field) return;
        const newOptions = [...field.options];
        newOptions[idx] = value;
        updateField(fieldId, { options: newOptions, possible_answers: newOptions });
    };

    const exportOptions = (fieldId) => {
        const field = schema.fields.find(f => f.id === fieldId);
        if (!field || !field.options) return;
        const csv = Papa.unparse({ fields: [field.label], data: field.options.map(opt => [opt]) });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, `${field.label.replace(/\s/g, '_')}_options.csv`);
    };

    const importOptions = (fieldId, file) => {
        Papa.parse(file, {
            complete: (results) => {
                const newOptions = results.data.flat().filter(v => v && v.trim());
                if (newOptions.length) {
                    updateField(fieldId, { options: newOptions, possible_answers: newOptions });
                }
            },
            header: false,
        });
    };

    const sensors = useSensors(useSensor(PointerSensor));

    if (loading) return <div className="wd-panel">Loading form builder...</div>;

    return (
        <div className="wd-panel" style={{ width: '90vw', maxWidth: '1200px', height: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="wd-panel-header">
                <div className="wd-panel-icon">📝</div>
                <div>
                    <div className="wd-panel-title">{isNew ? 'Create New Form' : 'Edit Form'}</div>
                    <div className="wd-panel-sub">Design your data collection form</div>
                </div>
                <button className="wd-panel-close" onClick={onCancel}>×</button>
            </div>

            <div className="wd-panel-body" style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
                {/* Form metadata */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="wd-field" style={{ marginBottom: '0.75rem' }}>
                        <label className="wd-label">Form Title</label>
                        <input className="wd-input" value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div className="wd-field">
                        <label className="wd-label">Description (optional)</label>
                        <textarea className="wd-textarea" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {/* Left: Field types */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <h3 className="wd-section">Field Types</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {FIELD_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setNewFieldType(type.id)}
                                    className={`wd-btn ${newFieldType === type.id ? 'wd-btn-primary' : 'wd-btn-secondary'}`}
                                    style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                                >
                                    {type.icon} {type.label}
                                </button>
                            ))}
                        </div>
                        <button className="wd-btn wd-btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={addField}>
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
                                                className={`wd-form-field-item ${selectedField === field.id ? 'selected' : ''}`}
                                                onClick={() => setSelectedField(field.id)}
                                                style={{ cursor: 'grab' }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <span style={{ marginRight: '0.5rem', color: '#999' }}>⋮⋮</span>
                                                        <strong>{field.label}</strong>
                                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#666' }}>
                                                            ({FIELD_TYPES.find(t => t.id === field.type)?.label})
                                                        </span>
                                                        {field.required && <span className="wd-badge wd-badge-danger" style={{ marginLeft: '0.5rem' }}>Required</span>}
                                                    </div>
                                                    <button className="wd-icon-btn" onClick={(e) => { e.stopPropagation(); removeField(field.id); }}>🗑️</button>
                                                </div>
                                            </div>
                                        </SortableItem>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                        {schema.fields.length === 0 && <div className="wd-empty-state">No fields yet. Add one from the left panel.</div>}
                    </div>

                    {/* Right: Field properties */}
                    <div style={{ flex: 1, minWidth: '280px' }}>
                        <h3 className="wd-section">Properties</h3>
                        {selectedField ? (
                            (() => {
                                const field = schema.fields.find(f => f.id === selectedField);
                                if (!field) return null;
                                const fieldTypeInfo = FIELD_TYPES.find(t => t.id === field.type);
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {/* Basic properties */}
                                        <div className="wd-field">
                                            <label className="wd-label">Label</label>
                                            <input className="wd-input" value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} />
                                        </div>
                                        <div className="wd-field">
                                            <label className="wd-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} />
                                                Required
                                            </label>
                                        </div>

                                        {/* Options (for select/radio) */}
                                        {fieldTypeInfo?.hasOptions && (
                                            <div className="wd-field">
                                                <label className="wd-label">Options</label>
                                                {field.options?.map((opt, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                                                        <input className="wd-input" value={opt} onChange={e => updateOption(field.id, idx, e.target.value)} />
                                                        <button className="wd-icon-btn" onClick={() => removeOption(field.id, idx)}>✕</button>
                                                    </div>
                                                ))}
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    <button className="wd-btn wd-btn-secondary" onClick={() => addOption(field.id)}>+ Add Option</button>
                                                    <button className="wd-btn wd-btn-secondary" onClick={() => exportOptions(field.id)}>📤 Export CSV</button>
                                                    <label className="wd-btn wd-btn-secondary" style={{ cursor: 'pointer' }}>
                                                        📥 Import CSV
                                                        <input type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => {
                                                            if (e.target.files[0]) importOptions(field.id, e.target.files[0]);
                                                            e.target.value = null;
                                                        }} />
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {/* Advanced properties (for applicable types) */}
                                        {fieldTypeInfo?.hasAdvanced && (
                                            <div className="wd-field">
                                                <label className="wd-label">Default Value</label>
                                                <input className="wd-input" value={field.default || ''} onChange={e => updateField(field.id, { default: e.target.value })} />
                                            </div>
                                        )}
                                        {field.type === 'number' && (
                                            <>
                                                <div className="wd-field">
                                                    <label className="wd-label">Minimum</label>
                                                    <input className="wd-input" type="number" value={field.min || ''} onChange={e => updateField(field.id, { min: e.target.value })} />
                                                </div>
                                                <div className="wd-field">
                                                    <label className="wd-label">Maximum</label>
                                                    <input className="wd-input" type="number" value={field.max || ''} onChange={e => updateField(field.id, { max: e.target.value })} />
                                                </div>
                                            </>
                                        )}
                                        {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
                                            <div className="wd-field">
                                                <label className="wd-label">Regex Validation</label>
                                                <input className="wd-input" value={field.regex || ''} onChange={e => updateField(field.id, { regex: e.target.value })} placeholder="e.g., ^[A-Za-z]+$" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="wd-empty-state">Select a field to edit its properties</div>
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
