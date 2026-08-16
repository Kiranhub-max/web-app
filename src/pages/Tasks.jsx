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

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showArchived, setShowArchived] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [{ data: taskData, error: taskErr }, { data: catData, error: catErr }] =
      await Promise.all([
        supabase
          .from('tasks')
          .select('*, categories(name, icon)')
          .order('created_at', { ascending: true }),
        supabase.from('categories').select('*').order('name'),
      ]);

    if (taskErr) console.error(taskErr);
    if (catErr) console.error(catErr);

    setTasks(taskData ?? []);
    setCategories(catData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openNewForm() {
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(task) {
    setForm({
      id: task.id,
      name: task.name,
      category_id: task.category_id ?? '',
      description: task.description ?? '',
      resource_url: task.resource_url ?? '',
      frequency: task.frequency,
      reminder_time: task.reminder_time ?? '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      user_id: user.id,
      name: form.name,
      category_id: form.category_id || null,
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
      console.error(error);
      alert('Could not save task: ' + error.message);
      return;
    }

    setShowForm(false);
    loadAll();
  }

  async function toggleArchive(task) {
    const nextStatus = task.status === 'active' ? 'archived' : 'active';
    const { error } = await supabase.from('tasks').update({ status: nextStatus }).eq('id', task.id);
    if (error) {
      console.error(error);
      return;
    }
    loadAll();
  }

  const visibleTasks = tasks.filter((t) => (showArchived ? true : t.status === 'active'));

  return (
    <div>
      <div className="card-header-row" style={{ marginBottom: 4 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          My Tasks
        </h1>
        <button className="btn btn-primary" onClick={openNewForm}>
          + Add Task
        </button>
      </div>
      <p className="page-subtitle">Define once — it shows up every day it's due.</p>

      <button
        className={'btn-text btn-filter-toggle' + (showArchived ? ' is-active' : '')}
        style={{ marginBottom: 12 }}
        onClick={() => setShowArchived((s) => !s)}
      >
        {showArchived ? 'Hide archived' : 'Show archived'}
      </button>

      <div className="card">
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : visibleTasks.length === 0 ? (
          <p className="empty-state">No tasks yet — add your first one above.</p>
        ) : (
          visibleTasks.map((task) => (
            <div className="task-row" key={task.id}>
              <div>
                <div className={'task-name' + (task.status === 'archived' ? ' archived' : '')}>
                  {task.name}
                </div>
                <div className={'task-category' + (task.status === 'archived' ? ' archived' : '')}>
                  {task.categories ? `${task.categories.icon} ${task.categories.name} · ` : ''}
                  {task.frequency}
                  {task.resource_url ? ' · 🔗 has resource' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {task.status === 'active' && (
                  <button className="btn-text btn-task-edit" onClick={() => openEditForm(task)}>
                    Edit
                  </button>
                )}
                <button className="btn-danger-text" onClick={() => toggleArchive(task)}>
                  {task.status === 'active' ? 'Archive' : 'Restore'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(31,36,31,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 20,
          }}
          onClick={() => setShowForm(false)}
        >
          <div className="card" style={{ maxWidth: 420, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 18 }}>{form.id ? 'Edit Task' : 'Add New Task'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label>Task Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
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
                </select>
              </div>
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
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                >
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
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
