import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isoDaysAgo, todayISO } from '../lib/dates';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function heatColor(pct) {
  if (pct === undefined || pct === null) return 'var(--paper-2)';
  if (pct === 0) return '#e7dccf';
  if (pct <= 25) return '#e2b8a3';
  if (pct <= 50) return '#e8cf8e';
  if (pct <= 75) return '#a9c9a0';
  return 'var(--moss)';
}

export default function Progress() {
  const [loading, setLoading] = useState(true);
  const [dailyProgress, setDailyProgress] = useState([]); // last 35 days, oldest→newest
  const [taskPerf, setTaskPerf] = useState([]);
  const [catPerf, setCatPerf] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const since = isoDaysAgo(34);

      const [{ data: dp, error: dpErr }, { data: tp, error: tpErr }, { data: cp, error: cpErr }] =
        await Promise.all([
          supabase
            .from('daily_progress')
            .select('date, completed_count, total_count, completion_pct')
            .gte('date', since)
            .order('date', { ascending: true }),
          supabase
            .from('task_performance')
            .select('task_id, name, completion_pct')
            .order('completion_pct', { ascending: false }),
          supabase
            .from('category_performance')
            .select('category_id, name, icon, completion_pct')
            .order('completion_pct', { ascending: false }),
        ]);

      if (dpErr) console.error(dpErr);
      if (tpErr) console.error(tpErr);
      if (cpErr) console.error(cpErr);

      setDailyProgress(dp ?? []);
      setTaskPerf(tp ?? []);
      setCatPerf(cp ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="empty-state">Loading…</p>;

  const byDate = new Map(dailyProgress.map((d) => [d.date, d]));

  // Overall completion = average of daily completion_pct across days with any task
  const overall =
    dailyProgress.length === 0
      ? 0
      : Math.round(dailyProgress.reduce((sum, d) => sum + Number(d.completion_pct || 0), 0) / dailyProgress.length);

  // Streak: a day counts if completion_pct === 100. Walk backward from today.
  let currentStreak = 0;
  for (let i = 0; ; i++) {
    const date = isoDaysAgo(i);
    const entry = byDate.get(date);
    if (i === 0 && !entry) break; // no tasks logged today yet — don't break streak, just stop counting today
    if (!entry || Number(entry.completion_pct) < 100) break;
    currentStreak++;
  }

  let bestStreak = 0;
  let running = 0;
  const sortedDates = [...dailyProgress].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const d of sortedDates) {
    if (Number(d.completion_pct) === 100) {
      running++;
      bestStreak = Math.max(bestStreak, running);
    } else {
      running = 0;
    }
  }

  // This week (Mon–Sun containing today)
  const todayDate = new Date(todayISO() + 'T00:00:00');
  const dayIdx = (todayDate.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - dayIdx);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  // Last 35 days for heatmap, oldest to newest, padded into weeks of 7
  const heatmapDays = Array.from({ length: 35 }, (_, i) => isoDaysAgo(34 - i));

  return (
    <div>
      <h1 className="page-title">Progress</h1>
      <p className="page-subtitle">Your consistency at a glance</p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{overall}%</div>
          <div className="stat-label">Overall Completion</div>
        </div>
        <div className="stat-card">
          <div className="stat-value amber">🔥 {currentStreak}</div>
          <div className="stat-label">Current Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">🏆 {bestStreak}</div>
          <div className="stat-label">Best Streak</div>
        </div>
      </div>

      <div className="section-heading">This Week</div>
      <div className="card">
        {weekDays.map((date, i) => {
          const entry = byDate.get(date);
          const pct = entry ? Number(entry.completion_pct) : 0;
          return (
            <div className="bar-row" key={date}>
              <span className="bar-label">{WEEKDAY_LABELS[i]}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="bar-pct">{entry ? `${pct}%` : '—'}</span>
            </div>
          );
        })}
      </div>

      <div className="section-heading">Task Performance</div>
      <div className="card">
        {taskPerf.length === 0 ? (
          <p className="empty-state">No completion history yet.</p>
        ) : (
          taskPerf.map((t) => (
            <div className="bar-row" key={t.task_id}>
              <span className="bar-label" title={t.name}>
                {t.name}
              </span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${t.completion_pct || 0}%` }} />
              </div>
              <span className="bar-pct">{Math.round(t.completion_pct || 0)}%</span>
            </div>
          ))
        )}
      </div>

      <div className="section-heading">Category Performance</div>
      <div className="card">
        {catPerf.length === 0 ? (
          <p className="empty-state">Add tasks with categories to see this.</p>
        ) : (
          catPerf.map((c) => (
            <div className="bar-row" key={c.category_id}>
              <span className="bar-label">
                {c.icon} {c.name}
              </span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${c.completion_pct || 0}%` }} />
              </div>
              <span className="bar-pct">{Math.round(c.completion_pct || 0)}%</span>
            </div>
          ))
        )}
      </div>

      <div className="section-heading">Last 35 Days</div>
      <div className="card">
        <div className="heatmap">
          {heatmapDays.map((date) => {
            const entry = byDate.get(date);
            const pct = entry ? Number(entry.completion_pct) : null;
            return (
              <div
                key={date}
                className="heatmap-cell"
                title={`${date}${pct !== null ? ` — ${pct}%` : ''}`}
                style={{ background: heatColor(pct) }}
              />
            );
          })}
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="heatmap-cell" style={{ background: heatColor(0) }} />
          <div className="heatmap-cell" style={{ background: heatColor(30) }} />
          <div className="heatmap-cell" style={{ background: heatColor(60) }} />
          <div className="heatmap-cell" style={{ background: heatColor(100) }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
