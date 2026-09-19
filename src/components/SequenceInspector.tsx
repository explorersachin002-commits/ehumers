import React, { useState, useEffect } from 'react';
import { Hash, ShieldCheck, RefreshCw, Layers, CheckCircle2, Lock } from 'lucide-react';
import { SequenceRecord } from '../types';

export const SequenceInspector: React.FC = () => {
  const [sequences, setSequences] = useState<SequenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSequences = () => {
    setIsLoading(true);
    fetch('/api/sequences')
      .then((res) => res.json())
      .then((data) => {
        if (data.sequences) {
          setSequences(data.sequences);
        }
      })
      .catch((err) => console.error('Failed to load sequences:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchSequences();
  }, []);

  return (
    <div id="sequence-inspector-view" className="space-y-4">
      {/* Overview Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Dispatch Sequence Engine (Atomic Running Serials)
              </h2>
              <p className="text-xs text-slate-500">
                Guarantees non-colliding serial numbers using SQLite <code className="font-mono text-blue-700">BEGIN IMMEDIATE</code> transactions & composite primary keys.
              </p>
            </div>
          </div>

          <button
            id="btn-refresh-sequences"
            onClick={fetchSequences}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Counters</span>
          </button>
        </div>
      </div>

      {/* Grid of Running Sequence Counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sequences.map((seq) => (
          <div
            key={`${seq.year}-${seq.doc_type}`}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">{seq.doc_type}</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Year {seq.year}
              </span>
            </div>

            <div className="flex items-baseline justify-between border-y border-slate-100 py-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                  Current Count
                </span>
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {seq.current_val}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                  Prefix Code
                </span>
                <span className="font-mono font-bold text-xs text-blue-600">
                  {seq.prefix_code}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
              <span className="text-[10px] text-slate-500 font-medium block mb-0.5">
                Next Generated Serial Preview:
              </span>
              <span className="font-mono font-bold text-blue-800 text-xs bg-white px-2 py-0.5 rounded-md border border-blue-200 inline-block">
                {seq.next_serial_preview}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Database Schema & Engine Guarantee Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <h3 className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
          <Lock className="w-4 h-4 text-slate-700" />
          <span>Thread-Safe Concurrency & Schema Guarantee</span>
        </h3>

        <div className="bg-slate-900 text-slate-100 p-3.5 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
          <span className="text-amber-400">-- 1. Sequential Numbering Tracker</span><br />
          <span className="text-blue-400">CREATE TABLE IF NOT EXISTS</span> sequence_tracker (<br />
          &nbsp;&nbsp;year <span className="text-emerald-400">INTEGER NOT NULL</span>,<br />
          &nbsp;&nbsp;doc_type <span className="text-emerald-400">TEXT NOT NULL</span>,<br />
          &nbsp;&nbsp;current_val <span className="text-emerald-400">INTEGER NOT NULL DEFAULT 0</span>,<br />
          &nbsp;&nbsp;<span className="text-blue-400">PRIMARY KEY</span> (year, doc_type)<br />
          );
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          When a new record is submitted, the application opens an immediate transaction on SQLite WAL mode, locks the sequence row corresponding to <code className="font-mono font-semibold">(year, doc_type)</code>, increments the counter atomically, formats the zero-padded 5-digit number (e.g. <code className="font-mono font-semibold">00001</code>), and commits the document record simultaneously. This guarantees zero race condition collisions or sequence gaps even under simultaneous staff entries.
        </p>
      </div>
    </div>
  );
};
