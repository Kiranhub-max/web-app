import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import TaskFormModal from '../components/TaskFormModal';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(undefined); // undefined = closed, null = new, object = edit
  const [showArchived, setShowArchived] = useState(false);

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
        <button className="btn btn-primary" onClick={() => setEditingTask(null)}>
          + Add Task
        </button>
      </div>
      <p className="page-subtitle">Define once — it shows up every day it's due.</p>

      <button
        className="btn-text"
        style={{
          marginBottom: 12,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 18px',
        }}
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
              <div style={{ display: 'flex', gap: 4 }}>
                {task.status === 'active' && (
                  <button className="btn-text" onClick={() => setEditingTask(task)}>
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

      {editingTask !== undefined && (
        <TaskFormModal
          task={editingTask}
          categories={categories}
          onClose={() => setEditingTask(undefined)}
          onSaved={() => {
            setEditingTask(undefined);
            loadAll();
          }}
        />
      )}
    </div>
  );
}
