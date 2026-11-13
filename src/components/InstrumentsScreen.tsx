import React, { useMemo, useState } from 'react';
import { ArrowRight, Play, Search, X } from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';
import { STUDIO_INSTRUMENTS } from '../data/studioData';
import {
  InstrumentCategory,
  MixerChannel,
  StudioInstrument,
} from '../types/studio';
import { FrequencyCurveSvg, HardwareSchematic } from './PrecisionControls';

interface InstrumentsScreenProps {
  channels: MixerChannel[];
  onLoadInstrumentToChannel: (instrument: StudioInstrument, channelId: string) => void;
  onNavigateToDeck: () => void;
}

const CATEGORIES: InstrumentCategory[] = [
  'All',
  'Field Recorders',
  'Microphones',
  'Synthesizers',
  'Sample Packs',
];

export const InstrumentsScreen: React.FC<InstrumentsScreenProps> = ({
  channels,
  onLoadInstrumentToChannel,
  onNavigateToDeck,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<InstrumentCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedItem, setInspectedItem] = useState<StudioInstrument | null>(null);
  const [targetChannelId, setTargetChannelId] = useState<string>(channels[0]?.id ?? 'ch-1');
  const [auditioningId, setAuditioningId] = useState<string | null>(null);
  const [loadedBanner, setLoadedBanner] = useState<string | null>(null);

  const filteredInstruments = useMemo(() => {
    return STUDIO_INSTRUMENTS.filter((item) => {
      const matchesCat =
        selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.model.toLowerCase().includes(q) ||
        item.manufacturer.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleAudition = (item: StudioInstrument) => {
    setAuditioningId(item.id);
    audioEngine.auditionInstrument(item.auditionSynth, item.auditionFreq);
    window.setTimeout(() => {
      setAuditioningId((prev) => (prev === item.id ? null : prev));
    }, 450);
  };

  const handleAssignToChannel = (item: StudioInstrument) => {
    onLoadInstrumentToChannel(item, targetChannelId);
    const targetCh = channels.find((c) => c.id === targetChannelId);
    setLoadedBanner(
      `${item.model} routed to Channel ${targetCh?.number ?? '01'} (${targetCh?.name ?? ''}).`
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e5e5e5] pb-6">
        <div>
          <div className="text-xs text-[#4c4546] mb-2 flex items-center gap-2">
            <span>Precision Hardware &amp; Tones</span>
            <span aria-hidden="true">·</span>
            <span>{STUDIO_INSTRUMENTS.length} Calibrated Units</span>
          </div>
          <h1 className="headline-xl text-[#000000]">Instruments</h1>
        </div>

        {/* Search Input with 1px sharp border */}
        <div className="relative w-full md:w-80">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4c4546] pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by model or maker..."
            aria-label="Filter instruments"
            className="w-full pl-9 pr-3 py-2.5 bg-[#ffffff] border border-[#e5e5e5] text-sm text-[#1a1c1c] placeholder:text-[#7e7576] focus:border-[#000000] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Category Filter Chips (Sharp 0px rectangles) */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Instrument categories">
        {CATEGORIES.map((category) => {
          const active = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-2 border label-sm uppercase cursor-pointer transition-colors duration-150 whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#000000] border-[#000000] text-[#ffffff]'
                  : 'bg-[#ffffff] border-[#e5e5e5] text-[#4c4546] hover:border-[#000000] hover:text-[#000000]'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {loadedBanner && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#ffffff] border border-[#000000] px-4 py-3">
          <span className="text-sm text-[#1a1c1c]">{loadedBanner}</span>
          <button
            type="button"
            onClick={onNavigateToDeck}
            className="inline-flex items-center gap-1.5 label-md text-[#fd591e] hover:text-[#000000] cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Open Studio Deck</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Catalog Grid */}
      {filteredInstruments.length === 0 ? (
        <div className="bg-[#ffffff] border border-[#e5e5e5] p-12 text-center space-y-3">
          <div className="headline-sm text-[#000000]">No matching instruments</div>
          <p className="text-sm text-[#4c4546]">
            Adjust your category filter or search term to view calibrated studio hardware.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-[#000000] text-[#ffffff] label-md cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstruments.map((item) => {
            const isAuditioning = auditioningId === item.id;
            return (
              <article
                key={item.id}
                className="bg-[#ffffff] border border-[#e5e5e5] flex flex-col justify-between"
              >
                <div>
                  <HardwareSchematic type={item.schematicType} />

                  <div className="p-6 space-y-3">
                    <div className="text-xs text-[#4c4546] flex items-center gap-2">
                      <span>{item.manufacturer}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.category}</span>
                    </div>

                    <h2 className="headline-sm text-[#000000]">{item.model}</h2>

                    <p className="text-sm text-[#4c4546] leading-relaxed">
                      {item.summary}
                    </p>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-[#e5e5e5] text-xs">
                      <div>
                        <dt className="text-[#7e7576]">Response</dt>
                        <dd className="font-mono-tabular text-[#1a1c1c] mt-0.5">
                          {item.specs.sampleRate}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#7e7576]">Dynamic Range</dt>
                        <dd className="font-mono-tabular text-[#1a1c1c] mt-0.5">
                          {item.specs.dynamicRange}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAudition(item)}
                    className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 border label-sm uppercase cursor-pointer transition-colors duration-150 ${
                      isAuditioning
                        ? 'bg-[#fd591e] border-[#fd591e] text-[#ffffff]'
                        : 'bg-[#000000] border-[#000000] text-[#ffffff] hover:bg-[#fd591e] hover:border-[#fd591e]'
                    }`}
                  >
                    <Play size={13} />
                    <span>{isAuditioning ? 'Auditioning' : 'Audition'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectedItem(item)}
                    className="py-2.5 px-4 border border-[#000000] bg-[#ffffff] text-[#000000] label-sm uppercase hover:bg-[#000000] hover:text-[#ffffff] transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Specs
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Technical Inspection Modal / Panel */}
      {inspectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-modal-title"
          className="fixed inset-0 z-50 bg-[#000000]/40 flex items-center justify-center p-4"
        >
          <div className="bg-[#ffffff] border border-[#000000] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5]">
              <div>
                <div className="text-xs text-[#4c4546]">
                  {inspectedItem.manufacturer} · {inspectedItem.category}
                </div>
                <h2 id="inspect-modal-title" className="headline-md text-[#000000]">
                  {inspectedItem.model}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close specifications panel"
                onClick={() => setInspectedItem(null)}
                className="w-9 h-9 border border-[#e5e5e5] flex items-center justify-center hover:border-[#000000] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm text-[#1a1c1c] leading-relaxed">
                {inspectedItem.summary}
              </p>

              <div>
                <div className="label-sm uppercase text-[#4c4546] mb-2">
                  Frequency Response Curve (20 Hz – 20 kHz)
                </div>
                <FrequencyCurveSvg points={inspectedItem.freqCurve} />
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-[#e5e5e5] py-4 text-sm">
                <div>
                  <dt className="text-xs text-[#4c4546]">Sample Rate / Bandwidth</dt>
                  <dd className="font-mono-tabular font-medium text-[#000000] mt-0.5">
                    {inspectedItem.specs.sampleRate}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#4c4546]">Dynamic Headroom</dt>
                  <dd className="font-mono-tabular font-medium text-[#000000] mt-0.5">
                    {inspectedItem.specs.dynamicRange}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#4c4546]">Output Impedance</dt>
                  <dd className="font-mono-tabular font-medium text-[#000000] mt-0.5">
                    {inspectedItem.specs.impedance}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#4c4546]">Circuit Architecture</dt>
                  <dd className="font-mono-tabular font-medium text-[#000000] mt-0.5">
                    {inspectedItem.specs.architecture}
                  </dd>
                </div>
              </dl>

              {/* Route to Studio Deck Channel */}
              <div className="bg-[#f9f9f9] border border-[#e5e5e5] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <label
                    htmlFor="channel-route-select"
                    className="label-sm uppercase text-[#4c4546] block"
                  >
                    Assign Tone to Console Bus
                  </label>
                  <select
                    id="channel-route-select"
                    value={targetChannelId}
                    onChange={(e) => setTargetChannelId(e.target.value)}
                    className="bg-[#ffffff] border border-[#e5e5e5] px-3 py-2 text-sm text-[#1a1c1c] focus:border-[#000000] focus:outline-none"
                  >
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        CH {ch.number} — {ch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAudition(inspectedItem)}
                    className="px-4 py-2.5 border border-[#000000] bg-[#ffffff] text-[#000000] label-sm uppercase hover:bg-[#f3f3f3] cursor-pointer"
                  >
                    Test Tone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAssignToChannel(inspectedItem);
                      setInspectedItem(null);
                    }}
                    className="px-4 py-2.5 bg-[#000000] text-[#ffffff] label-sm uppercase hover:bg-[#fd591e] transition-colors cursor-pointer"
                  >
                    Route to Channel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
