import React, { useMemo, useState } from 'react';
import { Download, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { SessionTakeItem, TakeStatus } from '../types/studio';
import { SharpCheckbox } from './PrecisionControls';

interface SessionLogScreenProps {
  takes: SessionTakeItem[];
  onToggleChecked: (id: string) => void;
  onChangeStatus: (id: string, status: TakeStatus) => void;
  onAddTake: (take: Omit<SessionTakeItem, 'id' | 'code'>) => void;
  onDeleteTake: (id: string) => void;
  onResetTakes: () => void;
}

const STATUS_FILTERS: ('All' | TakeStatus)[] = [
  'All',
  'Master',
  'Approved',
  'Review',
  'Archived',
];

const STATUS_CYCLE: TakeStatus[] = ['Review', 'Approved', 'Master', 'Archived'];

export const SessionLogScreen: React.FC<SessionLogScreenProps> = ({
  takes,
  onToggleChecked,
  onChangeStatus,
  onAddTake,
  onDeleteTake,
  onResetTakes,
}) => {
  const [filter, setFilter] = useState<'All' | TakeStatus>('All');
  const [showAddForm, setShowAddForm] = useState(false);

  const [title, setTitle] = useState('');
  const [timecode, setTimecode] = useState('00:22:10.00');
  const [duration, setDuration] = useState('01:30');
  const [engineer, setEngineer] = useState('H. Richter');
  const [status, setStatus] = useState<TakeStatus>('Review');
  const [notes, setNotes] = useState('');

  const filteredTakes = useMemo(() => {
    if (filter === 'All') return takes;
    return takes.filter((t) => t.status === filter);
  }, [takes, filter]);

  const verifiedCount = takes.filter((t) => t.checked).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTake({
      title: title.trim(),
      timecode: timecode.trim() || '00:00:00.00',
      duration: duration.trim() || '01:00',
      engineer: engineer.trim() || 'Studio Engineer',
      status,
      checked: status === 'Master' || status === 'Approved',
      notes: notes.trim() || 'Logged directly from Studio Minimal session sheet.',
    });
    setTitle('');
    setNotes('');
    setShowAddForm(false);
  };

  const handleDownloadCsv = () => {
    const header = ['Code', 'Title', 'Timecode', 'Duration', 'Engineer', 'Status', 'Verified', 'Notes'];
    const rows = takes.map((t) => [
      t.code,
      `"${t.title.replace(/"/g, '""')}"`,
      t.timecode,
      t.duration,
      `"${t.engineer.replace(/"/g, '""')}"`,
      t.status,
      t.checked ? 'Yes' : 'No',
      `"${t.notes.replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'klangwerk_session_log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e5e5e5] pb-6">
        <div>
          <div className="text-xs text-[#4c4546] mb-2 flex items-center gap-2 font-mono-tabular">
            <span>{takes.length} Logged Takes</span>
            <span aria-hidden="true">·</span>
            <span>{verifiedCount} Verified for Mastering</span>
          </div>
          <h1 className="headline-xl text-[#000000]">Session Log</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] label-sm uppercase hover:border-[#000000] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#000000] text-[#ffffff] label-sm uppercase hover:bg-[#fd591e] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus size={14} />
            <span>{showAddForm ? 'Close Form' : 'Log New Take'}</span>
          </button>
        </div>
      </div>

      {/* Add New Take Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#ffffff] border border-[#000000] p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
            <h2 className="headline-sm text-[#000000]">New Take Entry</h2>
            <span className="text-xs text-[#4c4546]">Appends directly to take sheet</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-6">
              <label htmlFor="take-title" className="label-sm uppercase text-[#4c4546] block mb-1.5">
                Take Title
              </label>
              <input
                id="take-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Analog Sub Sweep — Close Ribbon Mic"
                className="w-full px-3 py-2.5 bg-[#f9f9f9] border-b border-[#cfc4c5] text-sm text-[#1a1c1c] focus:border-[#fd591e] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="take-tc" className="label-sm uppercase text-[#4c4546] block mb-1.5">
                Timecode
              </label>
              <input
                id="take-tc"
                type="text"
                value={timecode}
                onChange={(e) => setTimecode(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#f9f9f9] border-b border-[#cfc4c5] font-mono-tabular text-sm text-[#1a1c1c] focus:border-[#fd591e] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="take-dur" className="label-sm uppercase text-[#4c4546] block mb-1.5">
                Duration
              </label>
              <input
                id="take-dur"
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#f9f9f9] border-b border-[#cfc4c5] font-mono-tabular text-sm text-[#1a1c1c] focus:border-[#fd591e] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="take-status" className="label-sm uppercase text-[#4c4546] block mb-1.5">
                Status
              </label>
              <select
                id="take-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TakeStatus)}
                className="w-full px-3 py-2.5 bg-[#f9f9f9] border-b border-[#cfc4c5] text-sm text-[#1a1c1c] focus:border-[#fd591e] focus:outline-none"
              >
                <option value="Review">Review</option>
                <option value="Approved">Approved</option>
                <option value="Master">Master</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label htmlFor="take-eng" className="label-sm uppercase text-[#4c4546] block mb-1.5">
                Engineer
              </label>
              <input
                id="take-eng"
                type="text"
                value={engineer}
                onChange={(e) => setEngineer(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#f9f9f9] border-b border-[#cfc4c5] text-sm text-[#1a1c1c] focus:border-[#fd591e] focus:outline-none"
              />
            </div>

            <div className="md:col-span-8">
              <label htmlFor="take-notes" className="label-sm uppercase text-[#4c4546] block mb-1.5">
                Technical Notes
              </label>
              <input
                id="take-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mic placement, preamp gain, or phase observations..."
                className="w-full px-3 py-2.5 bg-[#f9f9f9] border-b border-[#cfc4c5] text-sm text-[#1a1c1c] focus:border-[#fd591e] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 border border-[#e5e5e5] text-xs font-display font-medium text-[#1a1c1c] hover:border-[#000000] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#000000] text-[#ffffff] label-sm uppercase hover:bg-[#fd591e] transition-colors cursor-pointer"
            >
              Save Take
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter takes by status">
          {STATUS_FILTERS.map((item) => {
            const active = filter === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item)}
                className={`px-3.5 py-2 border label-sm uppercase cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#000000] border-[#000000] text-[#ffffff]'
                    : 'bg-[#ffffff] border-[#e5e5e5] text-[#4c4546] hover:border-[#000000] hover:text-[#000000]'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onResetTakes}
          className="inline-flex items-center gap-1.5 text-xs text-[#4c4546] hover:text-[#000000] cursor-pointer"
        >
          <RotateCcw size={13} />
          <span>Restore Default Sheet</span>
        </button>
      </div>

      {/* Take List (1px horizontal rules) */}
      <div className="bg-[#ffffff] border border-[#e5e5e5]">
        {filteredTakes.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="headline-sm text-[#000000]">No takes under {filter}</div>
            <p className="text-sm text-[#4c4546]">
              Log a new take above or switch filters to inspect all recorded passes.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e5e5e5]">
            {filteredTakes.map((take) => {
              const nextStatus =
                STATUS_CYCLE[
                  (STATUS_CYCLE.indexOf(take.status) + 1) % STATUS_CYCLE.length
                ];
              return (
                <div
                  key={take.id}
                  className="p-6 hover:bg-[#f9f9f9] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="pt-1">
                      <SharpCheckbox
                        checked={take.checked}
                        accent={take.status === 'Master'}
                        label={`Verify ${take.title}`}
                        onChange={() => onToggleChecked(take.id)}
                      />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#4c4546] font-mono-tabular">
                        <span className="text-[#000000] font-medium">{take.code}</span>
                        <span aria-hidden="true">·</span>
                        <span>{take.timecode}</span>
                        <span aria-hidden="true">·</span>
                        <span>{take.duration}</span>
                        <span aria-hidden="true">·</span>
                        <span>{take.engineer}</span>
                      </div>

                      <h3 className="headline-sm text-[#000000]">{take.title}</h3>

                      <p className="text-sm text-[#4c4546] leading-relaxed">
                        {take.notes}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pl-8 lg:pl-0">
                    <button
                      type="button"
                      onClick={() => onChangeStatus(take.id, nextStatus)}
                      title="Click to cycle take status"
                      className={`px-3.5 py-2 border label-sm uppercase cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                        take.status === 'Master'
                          ? 'bg-[#fd591e] border-[#fd591e] text-[#ffffff]'
                          : take.status === 'Approved'
                          ? 'bg-[#000000] border-[#000000] text-[#ffffff]'
                          : 'bg-[#f9f9f9] border-[#e5e5e5] text-[#1a1c1c] hover:border-[#000000]'
                      }`}
                    >
                      {take.status}
                    </button>

                    <button
                      type="button"
                      aria-label={`Delete ${take.title}`}
                      onClick={() => onDeleteTake(take.id)}
                      className="w-9 h-9 border border-[#e5e5e5] bg-[#ffffff] text-[#4c4546] hover:border-[#ba1a1a] hover:text-[#ba1a1a] flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
