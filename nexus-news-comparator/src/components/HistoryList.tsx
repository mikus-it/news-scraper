import React, { useEffect, useState } from 'react';
import { HistoryRecord } from '../types';
import { ClockIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';

interface Props {
  onSelect: (record: HistoryRecord) => void;
}

export default function HistoryList({ onSelect }: Props) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setHistory(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch history:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center text-slate-500 py-6 text-sm">Loading history...</div>;
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 border-t border-slate-200 pt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-center gap-2 mb-8">
        <ArchiveBoxIcon className="w-5 h-5 text-slate-400" />
        <h3 className="text-lg font-serif font-bold text-slate-700">Recent Analyses</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {history.map(record => (
          <button 
            key={record.ID}
            onClick={() => onSelect(record)}
            className="text-left bg-white border border-slate-200 hover:border-blue-400 p-5 rounded-2xl shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors">
                {record.Theme}
              </h4>
              <div className="flex items-center text-slate-400 text-xs shrink-0 bg-slate-50 px-2 py-1 rounded">
                <ClockIcon className="w-3 h-3 mr-1" />
                {new Date(record.Date).toLocaleDateString()}
              </div>
            </div>
            
            <p className="text-sm text-slate-500 line-clamp-2 mt-1">
              {record.Summary ? record.Summary.replace(/[#*]/g, '').substring(0, 100) + '...' : 'No summary available.'}
            </p>
            
            <div className="mt-4 flex flex-wrap gap-1">
              {record.Filters.split(',').filter(Boolean).map(filter => (
                <span key={filter} className="text-[10px] px-2 py-0.5 border border-slate-200 rounded uppercase tracking-wider text-slate-500">
                  {filter}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
