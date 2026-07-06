import React, { useEffect, useState } from 'react';
import { TrashIcon, XMarkIcon, CircleStackIcon } from '@heroicons/react/24/outline';

interface Props {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Request' | 'SourceArticle' | 'AnalysisResult'>('Request');

  const fetchData = () => {
    setLoading(true);
    fetch('/api/admin/db')
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch admin data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteRequest = async (id: number) => {
    if (!confirm(`Are you sure you want to delete request #${id} and all related data?`)) return;
    
    try {
      await fetch(`/api/admin/request/${id}`, { method: 'DELETE' });
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4 sm:p-8">
      <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <CircleStackIcon className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold font-serif text-slate-800">Admin Dashboard - Database View</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-4 bg-white">
          {(['Request', 'SourceArticle', 'AnalysisResult'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
            >
              {tab} ({data ? data[tab].length : '-'})
            </button>
          ))}
          <button 
            onClick={fetchData}
            className="ml-auto my-auto text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition"
          >
            Refresh Data
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-0 bg-slate-50/50">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading database records...</div>
          ) : data && data[activeTab] ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 sticky top-0 shadow-sm z-10 text-slate-600">
                  <tr>
                    {data[activeTab].length > 0 && Object.keys(data[activeTab][0]).map(key => (
                      <th key={key} className="px-4 py-3 font-semibold border-b bg-slate-100">{key}</th>
                    ))}
                    {activeTab === 'Request' && <th className="px-4 py-3 font-semibold border-b bg-slate-100 w-20">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data[activeTab].length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={100}>
                        No records found in {activeTab}.
                      </td>
                    </tr>
                  )}
                  {data[activeTab].map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                      {Object.entries(row).map(([k, v]: [string, any]) => (
                        <td key={k} className={`px-4 py-3 text-slate-600 ${k === 'URL' ? 'text-blue-500 underline max-w-xs truncate' : 'max-w-md truncate'}`}>
                          {k === 'URL' ? <a href={v} target="_blank" rel="noreferrer" title={v}>{v}</a> : String(v)}
                        </td>
                      ))}
                      {activeTab === 'Request' && (
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => handleDeleteRequest(row.ID)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition"
                            title="Delete Request"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-red-500">Failed to load data</div>
          )}
        </div>
      </div>
    </div>
  );
}
