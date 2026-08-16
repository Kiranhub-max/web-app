import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isoDaysAgo, formatShort } from '../lib/dates';

export default function History() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [dayDetail, setDayDetail] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const since = isoDaysAgo(60);
      const { data, error } = await supabase
        .from('daily_progress')
        .select('date, completed_count, total_count, completion_pct')
        .gte('date', since)
        .order('date', { ascending: false });

      if (error) console.error(error);
      setEntries(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleExpand(date) {
    if (expanded === date) {
      setExpanded(null);
      return;
    }
    setExpanded(date);

    if (!dayDetail[date]) {
      setLoadingDetail(true);
      const { data, error } = await supabase
        .from('completions')
        .select('completed, tasks(name)')
        .eq('date', date);

      if (error) console.error(error);
      setDayDetail((prev) => ({ ...prev, [date]: data ?? [] }));
      setLoadingDetail(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">History</h1>
      <p className="page-subtitle">Look back at any day</p>

      <div className="card">
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="empty-state">No history yet — come back once you've logged a few days.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.date} className="history-entry" onClick={() => toggleExpand(entry.date)}>
              <div className="history-date">{formatShort(entry.date)}</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${entry.completion_pct}%` }} />
              </div>
              <div className="progress-meta">
                {Math.round(entry.completion_pct)}% · {entry.completed_count} / {entry.total_count} completed
              </div>

              {expanded === entry.date && (
                <div className="history-detail">
                  {loadingDetail && !dayDetail[entry.date] ? (
                    <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Loading…</span>
                  ) : (
                    (dayDetail[entry.date] ?? []).map((c, i) => (
                      <div className="history-detail-row" key={i}>
                        <span className={'checkbox' + (c.completed ? ' checked' : '')} style={{ width: 18, height: 18 }}>
                          {c.completed && '✓'}
                        </span>
                        {c.tasks?.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
