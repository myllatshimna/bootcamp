import React, { useRef } from 'react';
import { StudioInstrument } from '../types/studio';

interface LinearFaderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  accent?: boolean;
  onChange: (value: number) => void;
  formatValue?: (val: number) => string;
}

export const LinearFader: React.FC<LinearFaderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  accent = false,
  onChange,
  formatValue,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const updateFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const norm = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + norm * (max - min);
    const snapped = Math.round(raw / step) * step;
    onChange(Math.max(min, Math.min(max, Number(snapped.toFixed(2)))));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    updateFromClientX(e.clientX);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(max, Number((value + step).toFixed(2))));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(min, Number((value - step).toFixed(2))));
    }
  };

  const displayText = formatValue ? formatValue(value) : `${value}${unit}`;
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="space-y-1.5 select-none">
      <div className="flex items-center justify-between gap-2">
        <span className="label-sm uppercase text-[#4c4546]">{label}</span>
        <span className="font-mono-tabular text-xs font-medium text-[#1a1c1c]">
          {displayText}
        </span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onKeyDown={handleKeyDown}
        className="relative h-7 bg-[#f3f3f3] border border-[#e5e5e5] cursor-ew-resize flex items-center touch-none hover:border-[#000000] transition-colors"
      >
        {/* Positional ticks */}
        {ticks.map((pct) => (
          <span
            key={pct}
            aria-hidden="true"
            style={{ left: `${pct}%` }}
            className="absolute top-0 h-1.5 w-px bg-[#cfc4c5] pointer-events-none"
          />
        ))}
        {/* Active bar */}
        <div
          style={{ width: `${ratio * 100}%` }}
          className={`h-full pointer-events-none transition-[background-color] duration-150 ${
            accent ? 'bg-[#fd591e]/15' : 'bg-[#000000]/8'
          }`}
        />
        {/* Fader indicator thumb */}
        <div
          style={{ left: `calc(${ratio * 100}% - 3px)` }}
          className={`absolute top-0 bottom-0 w-1.5 pointer-events-none ${
            accent ? 'bg-[#fd591e]' : 'bg-[#000000]'
          }`}
        />
      </div>
    </div>
  );
};

interface VerticalFaderProps {
  label: string;
  value: number; // 0..100
  muted?: boolean;
  level?: number; // 0..1 live meter
  onChange: (value: number) => void;
}

export const VerticalFader: React.FC<VerticalFaderProps> = ({
  label,
  value,
  muted = false,
  level = 0,
  onChange,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const updateFromClientY = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const norm = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    onChange(Math.round(norm * 100));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    updateFromClientY(e.clientY);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(100, value + 2));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(0, value - 2));
    }
  };

  const dbDisplay =
    value === 0 ? '-∞' : `${((value / 100) * 30 - 24).toFixed(1)}`;
  const tickMarks = [
    { pos: 90, label: '+3' },
    { pos: 75, label: '0' },
    { pos: 50, label: '-9' },
    { pos: 25, label: '-18' },
    { pos: 5, label: '-∞' },
  ];

  const clampedLevel = Math.max(0, Math.min(1, level));

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="flex items-stretch gap-2 h-48">
        {/* dB Scale column */}
        <div className="relative w-7 h-full text-[10px] font-mono-tabular text-[#4c4546]">
          {tickMarks.map((tick) => (
            <div
              key={tick.label}
              style={{ bottom: `${tick.pos}%` }}
              className="absolute right-0 translate-y-1/2 flex items-center gap-1"
            >
              <span>{tick.label}</span>
              <span className="w-1.5 h-px bg-[#cfc4c5]" />
            </div>
          ))}
        </div>

        {/* Fader rail */}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onKeyDown={handleKeyDown}
          className="relative w-10 h-full bg-[#f3f3f3] border border-[#e5e5e5] cursor-ns-resize touch-none hover:border-[#000000] transition-colors flex justify-center"
        >
          {/* Center track line */}
          <div className="w-px h-full bg-[#cfc4c5] pointer-events-none" />

          {/* Active level fill */}
          <div
            style={{ height: `${value}%` }}
            className={`absolute bottom-0 left-0 right-0 pointer-events-none ${
              muted ? 'bg-[#e2e2e2]' : 'bg-[#000000]/6'
            }`}
          />

          {/* Fader cap */}
          <div
            style={{ bottom: `calc(${value}% - 9px)` }}
            className={`absolute left-1 right-1 h-[18px] border pointer-events-none flex items-center justify-center ${
              muted
                ? 'bg-[#e8e8e8] border-[#7e7576]'
                : 'bg-[#000000] border-[#000000]'
            }`}
          >
            <span
              className={`w-full h-px ${
                muted ? 'bg-[#7e7576]' : 'bg-[#fd591e]'
              }`}
            />
          </div>
        </div>

        {/* Live output meter */}
        <div className="w-2 h-full bg-[#eeeeee] border border-[#e5e5e5] relative overflow-hidden">
          <div
            style={{ height: `${Math.min(100, clampedLevel * 135)}%` }}
            className={`absolute bottom-0 left-0 right-0 transition-[height] duration-75 ${
              clampedLevel > 0.85 ? 'bg-[#fd591e]' : 'bg-[#000000]'
            }`}
          />
        </div>
      </div>

      <div className="text-center">
        <div className="font-mono-tabular text-xs font-medium text-[#1a1c1c]">
          {dbDisplay} dB
        </div>
      </div>
    </div>
  );
};

interface SharpCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  accent?: boolean;
}

export const SharpCheckbox: React.FC<SharpCheckboxProps> = ({
  checked,
  onChange,
  label,
  accent = false,
}) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? 'Toggle item'}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 group cursor-pointer text-left"
    >
      <span
        className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-colors duration-150 ${
          checked
            ? accent
              ? 'bg-[#fd591e] border-[#fd591e]'
              : 'bg-[#000000] border-[#000000]'
            : 'bg-[#ffffff] border-[#1a1c1c] group-hover:border-[#fd591e]'
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path
              d="M2 5.2L4.2 7.4L8.2 2.6"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
        )}
      </span>
      {label && <span className="text-sm text-[#1a1c1c]">{label}</span>}
    </button>
  );
};

interface SharpRadioProps {
  selected: boolean;
  onSelect: () => void;
  label: string;
  description?: string;
  accent?: boolean;
}

export const SharpRadio: React.FC<SharpRadioProps> = ({
  selected,
  onSelect,
  label,
  description,
  accent = false,
}) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`w-full flex items-start gap-3 p-3.5 border text-left transition-colors duration-150 cursor-pointer ${
        selected
          ? 'bg-[#ffffff] border-[#000000]'
          : 'bg-[#f9f9f9] border-[#e5e5e5] hover:border-[#7e7576]'
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        className="shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <circle
          cx="9"
          cy="9"
          r="7.5"
          fill="#ffffff"
          stroke={selected ? (accent ? '#fd591e' : '#000000') : '#7e7576'}
          strokeWidth="1.25"
        />
        {selected && (
          <circle
            cx="9"
            cy="9"
            r="4"
            fill={accent ? '#fd591e' : '#000000'}
          />
        )}
      </svg>
      <div className="min-w-0">
        <div className="font-display text-sm font-medium text-[#1a1c1c]">{label}</div>
        {description && (
          <div className="text-xs text-[#4c4546] mt-0.5">{description}</div>
        )}
      </div>
    </button>
  );
};

export const HardwareSchematic: React.FC<{
  type: StudioInstrument['schematicType'];
}> = ({ type }) => {
  return (
    <div className="w-full h-40 bg-[#f3f3f3] border-b border-[#e5e5e5] flex items-center justify-center p-6">
      {type === 'recorder' && (
        <svg viewBox="0 0 220 110" className="w-full h-full max-w-[200px]" fill="none" aria-hidden="true">
          <rect x="20" y="14" width="180" height="82" stroke="#1a1c1c" strokeWidth="1.5" fill="#ffffff" />
          <rect x="32" y="26" width="96" height="36" stroke="#1a1c1c" strokeWidth="1.2" fill="#f9f9f9" />
          <polyline points="38,44 52,44 58,34 66,54 74,38 82,48 90,44 120,44" stroke="#fd591e" strokeWidth="1.5" />
          <circle cx="152" cy="38" r="10" stroke="#1a1c1c" strokeWidth="1.2" />
          <line x1="152" y1="38" x2="158" y2="32" stroke="#1a1c1c" strokeWidth="1.2" />
          <circle cx="180" cy="38" r="10" stroke="#1a1c1c" strokeWidth="1.2" />
          <line x1="180" y1="38" x2="180" y2="29" stroke="#fd591e" strokeWidth="1.5" />
          <rect x="32" y="72" width="18" height="12" fill="#000000" />
          <rect x="56" y="72" width="18" height="12" fill="#fd591e" />
          <rect x="80" y="72" width="18" height="12" stroke="#1a1c1c" strokeWidth="1.2" />
          <line x1="138" y1="78" x2="190" y2="78" stroke="#1a1c1c" strokeWidth="1.2" />
          <rect x="158" y="72" width="6" height="12" fill="#000000" />
        </svg>
      )}
      {type === 'condenser' && (
        <svg viewBox="0 0 220 110" className="w-full h-full max-w-[200px]" fill="none" aria-hidden="true">
          <rect x="36" y="42" width="116" height="26" stroke="#1a1c1c" strokeWidth="1.5" fill="#ffffff" />
          <rect x="152" y="40" width="34" height="30" stroke="#1a1c1c" strokeWidth="1.5" fill="#f9f9f9" />
          <line x1="160" y1="40" x2="160" y2="70" stroke="#7e7576" strokeWidth="1" />
          <line x1="168" y1="40" x2="168" y2="70" stroke="#7e7576" strokeWidth="1" />
          <line x1="176" y1="40" x2="176" y2="70" stroke="#7e7576" strokeWidth="1" />
          <rect x="26" y="48" width="10" height="14" fill="#000000" />
          <line x1="56" y1="55" x2="96" y2="55" stroke="#fd591e" strokeWidth="1.5" />
          <line x1="108" y1="48" x2="108" y2="62" stroke="#1a1c1c" strokeWidth="1.2" />
          <line x1="120" y1="48" x2="120" y2="62" stroke="#1a1c1c" strokeWidth="1.2" />
          <circle cx="196" cy="55" r="2.5" fill="#fd591e" />
        </svg>
      )}
      {type === 'synth' && (
        <svg viewBox="0 0 220 110" className="w-full h-full max-w-[200px]" fill="none" aria-hidden="true">
          <rect x="18" y="18" width="184" height="74" stroke="#1a1c1c" strokeWidth="1.5" fill="#ffffff" />
          <rect x="28" y="28" width="60" height="24" stroke="#1a1c1c" strokeWidth="1.2" fill="#1a1c1c" />
          <polyline points="34,42 44,34 54,46 64,34 74,42 82,40" stroke="#fd591e" strokeWidth="1.5" />
          <circle cx="110" cy="40" r="8" stroke="#1a1c1c" strokeWidth="1.2" />
          <circle cx="136" cy="40" r="8" stroke="#fd591e" strokeWidth="1.5" />
          <circle cx="162" cy="40" r="8" stroke="#1a1c1c" strokeWidth="1.2" />
          <circle cx="188" cy="40" r="8" stroke="#1a1c1c" strokeWidth="1.2" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => (
            <rect
              key={k}
              x={28 + k * 16.5}
              y="62"
              width="13"
              height="22"
              stroke="#1a1c1c"
              strokeWidth="1.2"
              fill={k === 2 || k === 5 ? '#000000' : '#f9f9f9'}
            />
          ))}
        </svg>
      )}
      {type === 'ribbon' && (
        <svg viewBox="0 0 220 110" className="w-full h-full max-w-[200px]" fill="none" aria-hidden="true">
          <rect x="86" y="14" width="48" height="66" stroke="#1a1c1c" strokeWidth="1.5" fill="#ffffff" />
          <line x1="110" y1="20" x2="110" y2="74" stroke="#fd591e" strokeWidth="1.5" />
          {[24, 32, 40, 48, 56, 64].map((y) => (
            <line key={y} x1="92" y1={y} x2="128" y2={y} stroke="#cfc4c5" strokeWidth="1" />
          ))}
          <rect x="98" y="80" width="24" height="14" fill="#000000" />
          <line x1="74" y1="47" x2="86" y2="47" stroke="#1a1c1c" strokeWidth="1.5" />
          <line x1="134" y1="47" x2="146" y2="47" stroke="#1a1c1c" strokeWidth="1.5" />
          <path d="M74 47 V92 H146 V47" stroke="#1a1c1c" strokeWidth="1.2" />
        </svg>
      )}
      {type === 'tape' && (
        <svg viewBox="0 0 220 110" className="w-full h-full max-w-[200px]" fill="none" aria-hidden="true">
          <rect x="24" y="16" width="172" height="78" stroke="#1a1c1c" strokeWidth="1.5" fill="#ffffff" />
          <circle cx="72" cy="52" r="22" stroke="#1a1c1c" strokeWidth="1.5" />
          <circle cx="72" cy="52" r="6" fill="#000000" />
          <circle cx="148" cy="52" r="22" stroke="#1a1c1c" strokeWidth="1.5" />
          <circle cx="148" cy="52" r="6" fill="#fd591e" />
          <line x1="72" y1="74" x2="148" y2="74" stroke="#1a1c1c" strokeWidth="1.2" />
          <rect x="98" y="79" width="24" height="8" fill="#000000" />
        </svg>
      )}
      {type === 'monitor' && (
        <svg viewBox="0 0 220 110" className="w-full h-full max-w-[200px]" fill="none" aria-hidden="true">
          <rect x="68" y="12" width="84" height="86" stroke="#1a1c1c" strokeWidth="1.5" fill="#ffffff" />
          <circle cx="110" cy="34" r="10" stroke="#1a1c1c" strokeWidth="1.2" />
          <circle cx="110" cy="34" r="3" fill="#fd591e" />
          <circle cx="110" cy="68" r="19" stroke="#1a1c1c" strokeWidth="1.5" />
          <circle cx="110" cy="68" r="7" fill="#000000" />
          <rect x="84" y="90" width="52" height="3" fill="#1a1c1c" />
        </svg>
      )}
    </div>
  );
};

export const FrequencyCurveSvg: React.FC<{ points: number[] }> = ({ points }) => {
  const width = 320;
  const height = 100;
  const padX = 12;
  const padY = 12;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const coords = points.map((val, idx) => {
    const x = padX + (idx / (points.length - 1)) * innerW;
    const y = padY + (1 - val / 100) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <div className="bg-[#ffffff] border border-[#e5e5e5] p-3">
      <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#4c4546] mb-2">
        <span>20 Hz</span>
        <span>1 kHz</span>
        <span>20 kHz</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24" fill="none">
        {[25, 50, 75].map((pct) => {
          const y = padY + (pct / 100) * innerH;
          return (
            <line
              key={pct}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="#e5e5e5"
              strokeWidth="1"
            />
          );
        })}
        <polyline
          points={coords.join(' ')}
          stroke="#000000"
          strokeWidth="1.75"
          fill="none"
        />
        {points.map((val, idx) => {
          const x = padX + (idx / (points.length - 1)) * innerW;
          const y = padY + (1 - val / 100) * innerH;
          return (
            <rect
              key={idx}
              x={x - 2}
              y={y - 2}
              width="4"
              height="4"
              fill={idx === 5 ? '#fd591e' : '#000000'}
            />
          );
        })}
      </svg>
    </div>
  );
};
