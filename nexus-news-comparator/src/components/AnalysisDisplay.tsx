import React from 'react';
import Markdown from 'react-markdown';
import { NewsAnalysisResult } from '../types';
import { ShieldCheckIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { DocumentTextIcon } from '@heroicons/react/24/solid';

interface Props {
  result: NewsAnalysisResult;
}

export default function AnalysisDisplay({ result }: Props) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex-1 bg-[#f8fafc] rounded-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-100 flex items-center gap-2 px-6 py-4 border-b border-slate-200">
          <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-800">Cross-Reference Analysis</h3>
        </div>
        <div className="p-6 md:p-8">
          <div className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:text-slate-800 prose-p:text-slate-700">
            <Markdown>{result.markdownContent}</Markdown>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col gap-4">
        {result.sources && result.sources.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 uppercase text-xs font-bold tracking-wider mb-4">
              <DocumentTextIcon className="w-4 h-4" />
              <span>CITED SOURCES</span>
            </div>
            <div className="flex flex-col gap-3">
              {result.sources.map((source, index) => {
                let domain = 'Website';
                try {
                  domain = new URL(source.url).hostname;
                } catch { /* ignore */ }

                return (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 rounded-xl p-3 transition-all"
                  >
                     <div className="flex items-start justify-between gap-2 overflow-hidden w-full">
                       <div className="min-w-0 pr-2 pb-1">
                         <div className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 decoration-blue-700 underline-offset-2 truncate">
                           {domain}
                         </div>
                         <div className="text-xs text-slate-400 mt-1 truncate max-w-full block" title={source.url}>
                           {source.url}
                         </div>
                       </div>
                       <ArrowTopRightOnSquareIcon className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0 mt-1" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-[#314a87] text-white rounded-2xl p-6 shadow-md">
          <h4 className="font-serif font-bold text-lg mb-3">Why Compare?</h4>
          <p className="text-sm text-blue-100 leading-relaxed">
            Different news outlets may present facts differently based on editorial bias, funding sources, or geographic focus. By evaluating stories across multiple verified publishers, we synthesize a more rounded, objective view of unfolding events.
          </p>
        </div>
      </div>
    </div>
  );
}
