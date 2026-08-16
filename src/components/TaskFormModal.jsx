import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const EMPTY_FORM = {
  id: null,
  name: '',
  category_id: '',
  description: '',
  resource_url: '',
  frequency: 'daily',
  reminder_time: '',
};

const NEW_CATEGORY_VALUE = '__new__';

export default function TaskFormModal({ task, categories, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('🏷️');

  useEffect(() => {
    if (task) {
      setForm({
        id: task.id,
        name: task.name,
        category_id: task.category_id ?? '',
        description: task.description ?? '',
        resource_url: task.resource_url ?? '',
        frequency: task.frequency,
        reminder_time: task.reminder_time ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [task]);

  const isNewCategory = form.category_id === NEW_CATEGORY_VALUE;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let categoryId = form.category_id || null;

    // Create the category first if the user chose "+ New category"
    if (isNewCategory) {
      if (!newCategoryName.trim()) {
        alert('Please name the new category.');
        setSaving(false);
        return;
      }
      const { data: newCat, error: catErr } = await supabase
        .from('categories')
        .insert({ user_id: user.id, name: newCategoryName.trim(), icon: newCategoryIcon || '🏷️' })
        .select()
        .single();

      if (catErr) {
        alert('Could not create category: ' + catErr.message);
        setSaving(false);
        return;
      }
      categoryId = newCat.id;
    }

    const payload = {
      user_id: user.id,
      name: form.name,
      category_id: categoryId,
      description: form.description || null,
      resource_url: form.resource_url || null,
      frequency: form.frequency,
      reminder_time: form.reminder_time || null,
    };

    const { error } = form.id
      ? await supabase.from('tasks').update(payload).eq('id', form.id)
      : await supabase.from('tasks').insert(payload);

    setSaving(false);

    if (error) {
      alert('Could not save task: ' + error.message);
      return;
    }

    onSaved();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 20,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 420, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 18 }}>{form.id ? 'Edit Task' : 'Add New Task'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Task Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="form-field">
            <label>Category</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
              <option value={NEW_CATEGORY_VALUE}>➕ New category…</option>
            </select>
          </div>

          {isNewCategory && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                style={{
                  width: 52,
                  padding: '11px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line)',
                  background: 'var(--paper-2)',
                  color: 'var(--ink)',
                  textAlign: 'center',
                }}
                value={newCategoryIcon}
                maxLength={2}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                aria-label="Category emoji"
              />
              <input
                style={{
                  flex: 1,
                  padding: '11px 13px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line)',
                  background: 'var(--paper-2)',
                  color: 'var(--ink)',
                }}
                placeholder="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
          )}

          <div className="form-field">
            <label>Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Resource URL</label>
            <input
              type="url"
              placeholder="https://…"
              value={form.resource_url}
              onChange={(e) => setForm({ ...form, resource_url: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Frequency</label>
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="form-field">
            <label>Reminder</label>
            <input
              type="time"
              value={form.reminder_time}
              onChange={(e) => setForm({ ...form, reminder_time: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
