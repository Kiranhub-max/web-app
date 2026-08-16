import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayISO, formatFriendly } from '../lib/dates';

export default function Today() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const date = todayISO();

  async function loadTasks() {
    setLoading(true);

    const { data: activeTasks, error: taskErr } = await supabase
      .from('tasks')
      .select('id, name, resource_url, categories(name, icon)')
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (taskErr) {
      console.error(taskErr);
      setLoading(false);
      return;
    }

    const { data: todaysCompletions, error: compErr } = await supabase
      .from('completions')
      .select('task_id, completed')
      .eq('date', date);

    if (compErr) console.error(compErr);

    const completedMap = new Map((todaysCompletions ?? []).map((c) => [c.task_id, c.completed]));

    setTasks(
      (activeTasks ?? []).map((t) => ({ ...t, completed: completedMap.get(t.id) ?? false }))
    );
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleTask(task) {
    const nextCompleted = !task.completed;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted } : t)));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('completions').upsert(
      {
        user_id: user.id,
        task_id: task.id,
        date,
        completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null,
      },
      { onConflict: 'task_id,date' }
    );

    if (error) {
      console.error(error);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !nextCompleted } : t)));
    }
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  return (
    <div>
      <h1 className="page-title">Good day 👋</h1>
      <p className="page-subtitle">{formatFriendly(date)}</p>

      <div className="card ring-card" style={{ marginBottom: 24 }}>
        <div className="ring-wrap">
          <svg viewBox="0 0 132 132">
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5b8cff" />
                <stop offset="100%" stopColor="#8b6bff" />
              </linearGradient>
            </defs>
            <circle className="ring-track" cx="66" cy="66" r="55" />
            <circle
              className="ring-fill"
              cx="66"
              cy="66"
              r="55"
              strokeDasharray={2 * Math.PI * 55}
              strokeDashoffset={2 * Math.PI * 55 * (1 - pct / 100)}
            />
          </svg>
          <div className="ring-center">
            <span className="ring-pct">{pct}%</span>
            <span className="ring-pct-label">Today</span>
          </div>
        </div>
        <div className="ring-meta">
          <div className="ring-meta-title">Today's Progress</div>
          <div className="ring-meta-value">
            {completedCount} / {total} tasks completed
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="empty-state">No active tasks yet. Add one in the Tasks tab.</p>
        ) : (
          tasks.map((task) => (
            <div className="task-row" key={task.id}>
              <button className="task-check-group" onClick={() => toggleTask(task)}>
                <span className={'checkbox' + (task.completed ? ' checked' : '')}>
                  {task.completed && '✓'}
                </span>
                <span>
                  <div className="task-name">{task.name}</div>
                  {task.categories && (
                    <div className="task-category">
                      {task.categories.icon} {task.categories.name}
                    </div>
                  )}
                </span>
              </button>
              {task.resource_url && (
                <a
                  className="resource-link"
                  href={task.resource_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  🔗 Open
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
