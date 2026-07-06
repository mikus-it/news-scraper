import React from 'react';
import { NewsSite } from '../types';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface Props {
  sites: NewsSite[];
  toggleSite: (id: string) => void;
  isIdle?: boolean;
}

export default function SourceSelector({ sites, toggleSite, isIdle = true }: Props) {
  return (
    <div className="mb-8">
      <h3 className={`text-sm font-semibold text-slate-700 mb-4 ${isIdle ? 'text-center' : ''}`}>Select News Sources to Monitor</h3>
      <div className={`flex flex-wrap gap-3 ${isIdle ? 'justify-center' : ''}`}>
        {sites.map((site) => (
          <button
            key={site.id}
            type="button"
            onClick={() => toggleSite(site.id)}
            className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all min-w-[140px] text-left ${
              site.selected
                ? 'bg-blue-50 border-blue-400 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${
              site.selected ? 'border border-blue-300 text-slate-500' : 'border border-slate-300 text-slate-400'
            }`}>
              {site.country === 'Intl' ? 'INTL' : site.country}
            </span>
            <span className="font-medium text-sm flex-1">{site.name}</span>
            {site.selected && (
              <CheckCircleIcon className="w-5 h-5 text-blue-500 shrink-0" />
            )}
          </button>
        ))}
      </div>
      <p className={`text-xs text-slate-400 mt-5 flex items-center gap-1 ${isIdle ? 'justify-center text-center' : 'text-left'}`}>
        <span>❄</span> Gemini will prioritize these domains but may include other relevant sources via Google Search.
      </p>
    </div>
  );
}
