import React, { useEffect, useRef, useState } from 'react';
import { Download, Pause, Play, Plus, Radio, Square, Volume2 } from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';
import { PATTERN_PRESETS } from '../data/studioData';
import { CalibrationSettings, MixerChannel, RecordedTake } from '../types/studio';
import { LinearFader, VerticalFader } from './PrecisionControls';

interface StudioDeckScreenProps {
  channels: MixerChannel[];
  onUpdateChannel: (id: string, patch: Partial<MixerChannel>) => void;
  onToggleStep: (channelId: string, stepIndex: number) => void;
  onApplyPreset: (presetName: string) => void;
  bpm: number;
  onChangeBpm: (bpm: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentStep: number;
  metronomeEnabled: boolean;
  onToggleMetronome: () => void;
  calibration: CalibrationSettings;
  recordedTakes: RecordedTake[];
  onAddRecordedTake: (take: RecordedTake) => void;
  onLogTakeToSession: (take: RecordedTake) => void;
}

export const StudioDeckScreen: React.FC<StudioDeckScreenProps> = ({
  channels,
  onUpdateChannel,
  onToggleStep,
  onApplyPreset,
  bpm,
  onChangeBpm,
  isPlaying,
  onTogglePlay,
  currentStep,
  metronomeEnabled,
  onToggleMetronome,
  calibration,
  recordedTakes,
  onAddRecordedTake,
  onLogTakeToSession,
}) => {
  const [scopeMode, setScopeMode] = useState<'waveform' | 'spectrum'>('waveform');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSource, setRecordSource] = useState<'microphone' | 'internal-bus'>('internal-bus');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [channelLevels, setChannelLevels] = useState<Record<string, number>>({});
  const [masterPeak, setMasterPeak] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Elapsed transport timecode
  useEffect(() => {
    if (!isPlaying) return;
    const start = performance.now() - elapsedMs;
    const id = window.setInterval(() => {
      setElapsedMs(performance.now() - start);
    }, 50);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  // Recording timer
  useEffect(() => {
    if (!isRecording) {
      setRecordSeconds(0);
      return;
    }
    const id = window.setInterval(() => {
      setRecordSeconds((s) => s + 0.1);
    }, 100);
    return () => window.clearInterval(id);
  }, [isRecording]);

  // Canvas Oscilloscope / FFT Spectrum + Meters loop
  useEffect(() => {
    let rafId = 0;
    const waveBuf = new Uint8Array(new ArrayBuffer(1024));
    const freqBuf = new Uint8Array(new ArrayBuffer(512));

    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
          canvas.width = Math.floor(rect.width * dpr);
          canvas.height = Math.floor(rect.height * dpr);
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          const w = rect.width;
          const h = rect.height;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);

          // Architectural grid lines
          ctx.strokeStyle = '#eeeeee';
          ctx.lineWidth = 1;
          for (let i = 1; i < 8; i++) {
            const x = (w / 8) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let j = 1; j < 4; j++) {
            const y = (h / 4) * j;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Center axis
          ctx.strokeStyle = '#e5e5e5';
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();

          if (scopeMode === 'waveform') {
            const hasData = audioEngine.getWaveformData(waveBuf);
            ctx.strokeStyle = isRecording ? '#fd591e' : '#000000';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            for (let i = 0; i < waveBuf.length; i++) {
              const x = (i / (waveBuf.length - 1)) * w;
              const v = hasData ? waveBuf[i] / 128.0 : 1.0;
              const y = (v * h) / 2;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          } else {
            const hasData = audioEngine.getFrequencyData(freqBuf);
            const bars = 48;
            const barWidth = (w - 16) / bars;
            for (let i = 0; i < bars; i++) {
              const bin = Math.floor((i / bars) * (freqBuf.length * 0.6));
              const val = hasData ? freqBuf[bin] / 255 : 0;
              const barH = Math.max(2, val * (h - 16));
              ctx.fillStyle = val > 0.72 ? '#fd591e' : '#000000';
              ctx.fillRect(8 + i * barWidth, h - 8 - barH, Math.max(2, barWidth - 3), barH);
            }
          }
          ctx.restore();
        }
      }

      const nextLevels: Record<string, number> = {};
      channels.forEach((ch) => {
        nextLevels[ch.id] = audioEngine.getChannelLevel(ch.id);
      });
      setChannelLevels(nextLevels);
      setMasterPeak(audioEngine.getMasterPeakLevel());

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, [channels, isRecording, scopeMode]);

  const handleToggleRecord = async () => {
    setRecordError(null);
    if (!isRecording) {
      try {
        const source = await audioEngine.startRecording();
        setRecordSource(source);
        setIsRecording(true);
      } catch (err) {
        setRecordError(
          err instanceof Error ? err.message : 'Unable to start audio capture.'
        );
      }
    } else {
      const take = await audioEngine.stopRecording(recordSource);
      setIsRecording(false);
      if (take) {
        onAddRecordedTake(take);
      }
    }
  };

  const handleResetTimecode = () => {
    setElapsedMs(0);
  };

  const formatTimecode = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const frames = Math.floor((ms % 1000) / 10);
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(
      mins % 60
    ).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(frames).padStart(
      2,
      '0'
    )}`;
  };

  const masterDb =
    masterPeak <= 0.001
      ? '-∞'
      : Math.max(-60, 20 * Math.log10(masterPeak)).toFixed(1);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e5e5e5] pb-6">
        <div>
          <div className="text-xs text-[#4c4546] mb-2 flex items-center gap-2">
            <span>4-Channel Console</span>
            <span aria-hidden="true">·</span>
            <span>{calibration.sampleRate}</span>
            <span aria-hidden="true">·</span>
            <span>{calibration.bitDepth}</span>
          </div>
          <h1 className="headline-xl text-[#000000]">Studio Deck</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {Object.keys(PATTERN_PRESETS).map((presetName) => (
            <button
              key={presetName}
              type="button"
              onClick={() => onApplyPreset(presetName)}
              className="px-3.5 py-2 border border-[#e5e5e5] bg-[#ffffff] text-[#1a1c1c] label-sm uppercase hover:border-[#000000] hover:bg-[#000000] hover:text-[#ffffff] transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
            >
              {presetName}
            </button>
          ))}
        </div>
      </div>

      {/* Transport & Scope Master Bar */}
      <section
        aria-label="Master transport and signal scope"
        className="bg-[#ffffff] border border-[#e5e5e5] p-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Transport Controls & Timecode */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="label-sm uppercase text-[#4c4546] mb-1">
                  Master Timecode
                </div>
                <div className="font-mono-tabular text-3xl md:text-4xl font-medium tracking-tight text-[#000000]">
                  {formatTimecode(elapsedMs)}
                </div>
              </div>
              <div className="text-right">
                <div className="label-sm uppercase text-[#4c4546] mb-1">
                  Peak Output
                </div>
                <div
                  className={`font-mono-tabular text-lg font-medium ${
                    masterPeak > 0.85 ? 'text-[#fd591e]' : 'text-[#1a1c1c]'
                  }`}
                >
                  {masterDb} dBFS
                </div>
              </div>
            </div>

            {/* Transport Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onTogglePlay}
                className={`inline-flex items-center gap-2 px-5 py-3 label-md cursor-pointer transition-colors duration-150 whitespace-nowrap shrink-0 ${
                  isPlaying
                    ? 'bg-[#ffffff] text-[#000000] border border-[#000000]'
                    : 'bg-[#000000] text-[#ffffff] border border-[#000000] hover:bg-[#1b1b1b]'
                }`}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isPlaying) onTogglePlay();
                  handleResetTimecode();
                }}
                aria-label="Stop and reset timecode"
                className="inline-flex items-center gap-2 px-4 py-3 border border-[#e5e5e5] bg-[#f9f9f9] text-[#1a1c1c] label-md hover:border-[#000000] transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Square size={14} />
                <span>Stop</span>
              </button>

              <button
                type="button"
                onClick={handleToggleRecord}
                className={`inline-flex items-center gap-2 px-5 py-3 border label-md cursor-pointer transition-colors duration-150 whitespace-nowrap shrink-0 ${
                  isRecording
                    ? 'bg-[#fd591e] border-[#fd591e] text-[#ffffff]'
                    : 'bg-[#ffffff] border-[#1a1c1c] text-[#1a1c1c] hover:bg-[#fd591e] hover:border-[#fd591e] hover:text-[#ffffff]'
                }`}
              >
                <Radio size={15} />
                <span>
                  {isRecording
                    ? `Stop Rec (${recordSeconds.toFixed(1)}s)`
                    : 'Record'}
                </span>
              </button>
            </div>

            {recordError && (
              <div className="text-xs text-[#ba1a1a] border border-[#ba1a1a] bg-[#ffdad6] px-3 py-2">
                {recordError}
              </div>
            )}

            {/* Tempo & Metronome row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#e5e5e5]">
              <div className="flex items-center justify-between border border-[#e5e5e5] bg-[#f9f9f9] px-3 py-2">
                <span className="label-sm uppercase text-[#4c4546]">Tempo</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease BPM"
                    onClick={() => onChangeBpm(Math.max(60, bpm - 2))}
                    className="w-7 h-7 border border-[#e5e5e5] bg-[#ffffff] text-sm font-medium hover:border-[#000000] cursor-pointer"
                  >
                    −
                  </button>
                  <span className="font-mono-tabular text-sm font-medium w-16 text-center">
                    {bpm} BPM
                  </span>
                  <button
                    type="button"
                    aria-label="Increase BPM"
                    onClick={() => onChangeBpm(Math.min(180, bpm + 2))}
                    className="w-7 h-7 border border-[#e5e5e5] bg-[#ffffff] text-sm font-medium hover:border-[#000000] cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleMetronome}
                className={`flex items-center justify-between px-3 py-2 border label-sm uppercase cursor-pointer transition-colors duration-150 ${
                  metronomeEnabled
                    ? 'bg-[#000000] border-[#000000] text-[#ffffff]'
                    : 'bg-[#f9f9f9] border-[#e5e5e5] text-[#1a1c1c] hover:border-[#000000]'
                }`}
              >
                <span>Metronome Click</span>
                <span className="font-mono-tabular">
                  {metronomeEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Live Oscilloscope & Spectrum Display */}
          <div className="lg:col-span-7 flex flex-col justify-between border border-[#e5e5e5] bg-[#f9f9f9] p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3 text-xs text-[#4c4546]">
                <span className="font-display font-medium text-[#1a1c1c]">
                  Master Bus Analyzer
                </span>
                <span aria-hidden="true">/</span>
                <span className="font-mono-tabular">
                  Step {String(currentStep + 1).padStart(2, '0')} of 16
                </span>
              </div>

              <div className="flex items-center border border-[#e5e5e5] bg-[#ffffff]">
                <button
                  type="button"
                  onClick={() => setScopeMode('waveform')}
                  className={`px-3 py-1.5 label-sm uppercase cursor-pointer transition-colors ${
                    scopeMode === 'waveform'
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'text-[#4c4546] hover:text-[#000000]'
                  }`}
                >
                  Waveform
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode('spectrum')}
                  className={`px-3 py-1.5 label-sm uppercase cursor-pointer transition-colors ${
                    scopeMode === 'spectrum'
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'text-[#4c4546] hover:text-[#000000]'
                  }`}
                >
                  Spectrum
                </button>
              </div>
            </div>

            <div className="relative flex-1 min-h-[168px] border border-[#e5e5e5] bg-[#ffffff]">
              <canvas
                ref={canvasRef}
                className="w-full h-full block"
                aria-label="Live master bus audio waveform and spectrum visualizer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4-Channel Mixing Console */}
      <section aria-label="Four-channel mixing console" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="headline-md text-[#000000]">Channel Strips</h2>
          <span className="text-xs text-[#4c4546]">
            Drag vertical faders or use arrow keys for 2 dB steps
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {channels.map((ch) => (
            <article
              key={ch.id}
              className="bg-[#ffffff] border border-[#e5e5e5] p-6 flex flex-col justify-between gap-6"
            >
              {/* Channel Header */}
              <div className="flex items-start justify-between gap-3 border-b border-[#e5e5e5] pb-4">
                <div className="min-w-0">
                  <div className="font-mono-tabular text-xs text-[#4c4546]">
                    CH {ch.number}
                  </div>
                  <h3 className="headline-sm text-[#000000] truncate mt-0.5">
                    {ch.name}
                  </h3>
                  <div className="text-xs text-[#4c4546] truncate mt-0.5">
                    {ch.sourceLabel}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => audioEngine.triggerStep(ch, currentStep)}
                  title={`Trigger ${ch.name}`}
                  className="px-2.5 py-1.5 border border-[#e5e5e5] bg-[#f9f9f9] label-sm uppercase text-[#1a1c1c] hover:bg-[#000000] hover:text-[#ffffff] hover:border-[#000000] transition-colors cursor-pointer shrink-0"
                >
                  Trig
                </button>
              </div>

              {/* Vertical Gain Fader & Live Meter */}
              <div className="py-1 flex justify-center">
                <VerticalFader
                  label={`${ch.name} level`}
                  value={ch.gain}
                  muted={ch.muted}
                  level={channelLevels[ch.id] ?? 0}
                  onChange={(val) => onUpdateChannel(ch.id, { gain: val })}
                />
              </div>

              {/* Filter & Pan Controls */}
              <div className="space-y-4 pt-4 border-t border-[#e5e5e5]">
                <LinearFader
                  label="Lowpass Cutoff"
                  value={ch.cutoff}
                  min={180}
                  max={10000}
                  step={60}
                  onChange={(val) => onUpdateChannel(ch.id, { cutoff: val })}
                  formatValue={(val) =>
                    val >= 1000 ? `${(val / 1000).toFixed(1)} kHz` : `${val} Hz`
                  }
                />

                <LinearFader
                  label="Stereo Pan"
                  value={ch.pan}
                  min={-100}
                  max={100}
                  step={5}
                  accent={Math.abs(ch.pan) > 0}
                  onChange={(val) => onUpdateChannel(ch.id, { pan: val })}
                  formatValue={(val) =>
                    val === 0 ? 'Center' : val < 0 ? `L ${Math.abs(val)}` : `R ${val}`
                  }
                />
              </div>

              {/* Mute & Solo */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onUpdateChannel(ch.id, { muted: !ch.muted })}
                  className={`py-2.5 border label-sm uppercase cursor-pointer transition-colors duration-150 ${
                    ch.muted
                      ? 'bg-[#fd591e] border-[#fd591e] text-[#ffffff]'
                      : 'bg-[#f9f9f9] border-[#e5e5e5] text-[#1a1c1c] hover:border-[#000000]'
                  }`}
                >
                  {ch.muted ? 'Muted' : 'Mute'}
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateChannel(ch.id, { solo: !ch.solo })}
                  className={`py-2.5 border label-sm uppercase cursor-pointer transition-colors duration-150 ${
                    ch.solo
                      ? 'bg-[#000000] border-[#000000] text-[#ffffff]'
                      : 'bg-[#f9f9f9] border-[#e5e5e5] text-[#1a1c1c] hover:border-[#000000]'
                  }`}
                >
                  {ch.solo ? 'Soloed' : 'Solo'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 16-Step Sequencer Matrix */}
      <section
        aria-label="16-step sequencer matrix"
        className="bg-[#ffffff] border border-[#e5e5e5] p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="headline-md text-[#000000]">16-Step Sequencer Matrix</h2>
            <p className="text-xs text-[#4c4546] mt-0.5">
              Click grid cells to program rhythmic triggers across all four console buses.
            </p>
          </div>
          <div className="font-mono-tabular text-xs text-[#4c4546]">
            16th Note Grid · 4 Bars
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="min-w-[680px] space-y-2">
            {/* Step Number Header */}
            <div className="grid grid-cols-[150px_repeat(16,minmax(0,1fr))] gap-1.5 items-center">
              <div className="label-sm uppercase text-[#4c4546]">Channel</div>
              {Array.from({ length: 16 }).map((_, idx) => {
                const isCurrent = isPlaying && currentStep === idx;
                return (
                  <div
                    key={idx}
                    className={`text-center font-mono-tabular text-[11px] py-1 border-b ${
                      isCurrent
                        ? 'text-[#fd591e] border-[#fd591e] font-medium'
                        : 'text-[#4c4546] border-[#e5e5e5]'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            {/* Channel Step Rows */}
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="grid grid-cols-[150px_repeat(16,minmax(0,1fr))] gap-1.5 items-center"
              >
                <div className="pr-2 truncate text-xs font-display font-medium text-[#1a1c1c]">
                  {ch.number} · {ch.name}
                </div>
                {ch.steps.map((active, stepIdx) => {
                  const isPlayhead = isPlaying && currentStep === stepIdx;
                  const isDownbeat = stepIdx % 4 === 0;
                  return (
                    <button
                      key={stepIdx}
                      type="button"
                      aria-label={`${ch.name} step ${stepIdx + 1}`}
                      aria-pressed={active}
                      onClick={() => onToggleStep(ch.id, stepIdx)}
                      className={`h-9 border transition-colors duration-100 cursor-pointer relative ${
                        active
                          ? isPlayhead
                            ? 'bg-[#fd591e] border-[#fd591e]'
                            : 'bg-[#000000] border-[#000000]'
                          : isPlayhead
                          ? 'bg-[#ffdbd0] border-[#fd591e]'
                          : isDownbeat
                          ? 'bg-[#f3f3f3] border-[#cfc4c5] hover:border-[#000000]'
                          : 'bg-[#ffffff] border-[#e5e5e5] hover:border-[#000000]'
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Captured Audio Takes */}
      {recordedTakes.length > 0 && (
        <section
          aria-label="Captured audio takes"
          className="bg-[#ffffff] border border-[#e5e5e5] p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="headline-md text-[#000000]">Captured Takes</h2>
            <span className="text-xs text-[#4c4546] font-mono-tabular">
              {recordedTakes.length} Recording{recordedTakes.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="divide-y divide-[#e5e5e5] border-t border-b border-[#e5e5e5]">
            {recordedTakes.map((take) => (
              <div
                key={take.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="font-display text-sm font-medium text-[#000000]">
                    {take.title}
                  </div>
                  <div className="text-xs text-[#4c4546] font-mono-tabular flex items-center gap-2">
                    <span>
                      {take.source === 'microphone' ? 'Microphone Input' : 'Internal Master Bus'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{take.durationSec.toFixed(1)}s</span>
                    <span aria-hidden="true">·</span>
                    <span>{(take.sampleRate / 1000).toFixed(1)} kHz</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <audio
                    controls
                    src={take.url}
                    className="h-9 max-w-[260px]"
                    aria-label={`Play ${take.title}`}
                  />
                  <a
                    href={take.url}
                    download={`${take.title.replace(/\s+/g, '_').toLowerCase()}.webm`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#e5e5e5] bg-[#f9f9f9] text-xs font-display font-medium text-[#1a1c1c] hover:border-[#000000]"
                  >
                    <Download size={13} />
                    <span>Save Clip</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => onLogTakeToSession(take)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#000000] text-[#ffffff] text-xs font-display font-medium hover:bg-[#fd591e] transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Log Take</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Subtle audio tip */}
      <div className="flex items-center gap-2 text-xs text-[#4c4546]">
        <Volume2 size={14} />
        <span>
          Audio synthesis and recording operate locally in your browser via Web Audio API.
        </span>
      </div>
    </div>
  );
};
