
import React, { useState, useCallback } from 'react';
import { MagnifyingGlassIcon, SparklesIcon, ArrowLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/solid';
import { DEFAULT_NEWS_SITES, SUGGESTED_TOPICS } from './constants';
import { NewsSite, AppState, NewsAnalysisResult, HistoryRecord } from './types';
import SourceSelector from './components/SourceSelector';
import AnalysisDisplay from './components/AnalysisDisplay';
import HistoryList from './components/HistoryList';
import AdminPanel from './components/AdminPanel';
import { analyzeNewsTopic } from './services/geminiService';

function App() {
  const [query, setQuery] = useState('');
  const [sites, setSites] = useState<NewsSite[]>(DEFAULT_NEWS_SITES);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<NewsAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  const toggleSite = (id: string) => {
    setSites((prev) =>
      prev.map((site) => (site.id === id ? { ...site, selected: !site.selected } : site))
    );
  };

  const handleSearch = useCallback(async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const searchQuery = overrideQuery || query;

    if (!searchQuery.trim()) return;

    const selectedDomains = sites.filter(s => s.selected).map(s => s.domain);
    if (selectedDomains.length === 0) {
      setError("Please select at least one news source.");
      return;
    }

    setAppState(AppState.LOADING);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeNewsTopic(searchQuery, selectedDomains);
      setResult(data);
      setAppState(AppState.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
      setAppState(AppState.ERROR);
    }
  }, [query, sites]);

  const handleSelectHistory = useCallback((record: HistoryRecord) => {
    setQuery(record.Theme);
    const rebuiltMarkdown = `## Historical Analysis

### Kopsavilkums (Summary)
${record.Summary}

### Avotu Salīdzinājums
${record.Differences}

### Secinājumi
${record.Conclusion}
`;
    setResult({
      markdownContent: rebuiltMarkdown.trim(),
      sources: [] // Could fetch sources mapping later
    });
    setAppState(AppState.SUCCESS);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setAppState(AppState.IDLE); setQuery(''); }}>
            <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-lg font-serif shadow-sm">
              N
            </div>
            <span className="font-serif font-bold text-xl text-slate-900 tracking-tight">Nexus News</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Header / Back button when deep */}
        {appState !== AppState.IDLE && (
          <button 
            onClick={() => { setAppState(AppState.IDLE); setQuery(''); }}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 text-sm font-medium"
          >
            <ArrowLeftIcon className="w-4 h-4" /> Start Over
          </button>
        )}

        {/* Search Section */}
        <section className={`transition-all duration-500 ${appState === AppState.IDLE ? 'py-10 text-center mx-auto' : 'mb-10 text-left'}`}>
          {appState === AppState.IDLE && (
            <>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">
                See the full picture.
              </h2>
              <p className="text-lg text-slate-600 mb-10">
                Compare stories across {sites.filter(s => s.selected).length} sources instantly.
              </p>
            </>
          )}

          <div className={`${appState === AppState.IDLE ? '' : 'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm'}`}>
            <SourceSelector sites={sites} toggleSite={toggleSite} isIdle={appState === AppState.IDLE} />
            
            <form onSubmit={(e) => handleSearch(e)} className="relative mt-4 group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a news topic (e.g., 'Rail Baltica funding issues')..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-700 bg-[#0f172a] text-white placeholder-slate-500 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-lg transition-all shadow-xl"
              />
              <MagnifyingGlassIcon className="w-6 h-6 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <button
                type="submit"
                disabled={appState === AppState.LOADING || !query.trim()}
                className="absolute right-2 top-2 bottom-2 bg-[#1e40af] hover:bg-blue-700 text-white px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {appState === AppState.LOADING ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze'
                )}
              </button>
            </form>
          </div>

          {/* Suggested Topics (Only shown when IDLE) */}
          {appState === AppState.IDLE && (
            <>
              <div className="mt-8 flex flex-wrap justify-center items-center gap-2">
                <span className="text-sm font-medium text-slate-400 mr-2">Trending now:</span>
                {SUGGESTED_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => {
                      setQuery(topic);
                      handleSearch(undefined, topic);
                    }}
                    className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <HistoryList onSelect={handleSelectHistory} />
            </>
          )}
        </section>

        {/* Error State */}
        {appState === AppState.ERROR && error && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* Loading State Skeleton */}
        {appState === AppState.LOADING && (
          <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-4">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
             </div>
             <div className="flex gap-2 justify-center text-slate-400 text-sm items-center">
                <SparklesIcon className="w-4 h-4 animate-bounce" />
                <span>Reading headlines from {sites.filter(s => s.selected).map(s => s.name).join(', ')}...</span>
             </div>
          </div>
        )}

        {/* Success / Result State */}
        {appState === AppState.SUCCESS && result && (
          <AnalysisDisplay result={result} />
        )}
      </main>
      
      {/* Admin Toggle */}
      <button 
        onClick={() => setShowAdmin(true)}
        className="fixed bottom-4 right-4 p-3 bg-white border border-slate-200 text-slate-500 rounded-full shadow-md hover:text-indigo-600 hover:border-indigo-200 transition-colors"
        title="Admin Dashboard"
      >
        <Cog6ToothIcon className="w-5 h-5" />
      </button>

      {/* Admin Panel Overlay */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

export default App;
