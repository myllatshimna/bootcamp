import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';
import { CalibrationSettings } from '../types/studio';
import { LinearFader, SharpRadio } from './PrecisionControls';

interface CalibrationScreenProps {
  settings: CalibrationSettings;
  onUpdateSettings: (patch: Partial<CalibrationSettings>) => void;
  onResetDefaults: () => void;
}

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({
  settings,
  onUpdateSettings,
  onResetDefaults,
}) => {
  const [activeTone, setActiveTone] = useState<'1khz' | 'pink' | '60hz' | null>(null);
  const [toneGain, setToneGain] = useState(35);
  const [meterLevel, setMeterLevel] = useState(0);

  useEffect(() => {
    if (!activeTone) {
      audioEngine.stopTestTone();
      setMeterLevel(0);
      return;
    }
    audioEngine.startTestTone(activeTone, toneGain);
    const id = window.setInterval(() => {
      setMeterLevel(audioEngine.getMasterPeakLevel());
    }, 60);
    return () => {
      window.clearInterval(id);
      audioEngine.stopTestTone();
    };
  }, [activeTone, toneGain]);

  const toggleTone = (mode: '1khz' | 'pink' | '60hz') => {
    setActiveTone((prev) => (prev === mode ? null : mode));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e5e5e5] pb-6">
        <div>
          <div className="text-xs text-[#4c4546] mb-2 flex items-center gap-2 font-mono-tabular">
            <span>{settings.sampleRate}</span>
            <span aria-hidden="true">·</span>
            <span>{settings.bitDepth}</span>
            <span aria-hidden="true">·</span>
            <span>Target {settings.loudnessTarget}</span>
          </div>
          <h1 className="headline-xl text-[#000000]">Calibration</h1>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveTone(null);
            onResetDefaults();
          }}
          className="px-4 py-2.5 border border-[#000000] bg-[#ffffff] text-[#000000] label-sm uppercase hover:bg-[#000000] hover:text-[#ffffff] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Reset Reference Defaults
        </button>
      </div>

      {/* Format & Reference Radio Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sample Rate */}
        <section className="bg-[#ffffff] border border-[#e5e5e5] p-6 space-y-4">
          <div className="border-b border-[#e5e5e5] pb-3">
            <h2 className="headline-sm text-[#000000]">Clock Sample Rate</h2>
            <p className="text-xs text-[#4c4546] mt-0.5">
              Internal DSP &amp; export resolution
            </p>
          </div>
          <div className="space-y-2.5" role="radiogroup" aria-label="Sample rate">
            <SharpRadio
              selected={settings.sampleRate === '44.1 kHz'}
              onSelect={() => onUpdateSettings({ sampleRate: '44.1 kHz' })}
              label="44.1 kHz"
              description="Red Book CD standard master clock"
            />
            <SharpRadio
              selected={settings.sampleRate === '48 kHz'}
              onSelect={() => onUpdateSettings({ sampleRate: '48 kHz' })}
              label="48 kHz"
              description="Broadcast & studio sync standard"
              accent
            />
            <SharpRadio
              selected={settings.sampleRate === '96 kHz'}
              onSelect={() => onUpdateSettings({ sampleRate: '96 kHz' })}
              label="96 kHz"
              description="High-bandwidth archival field capture"
            />
          </div>
        </section>

        {/* Bit Depth */}
        <section className="bg-[#ffffff] border border-[#e5e5e5] p-6 space-y-4">
          <div className="border-b border-[#e5e5e5] pb-3">
            <h2 className="headline-sm text-[#000000]">Converter Bit Depth</h2>
            <p className="text-xs text-[#4c4546] mt-0.5">
              Dynamic headroom &amp; quantization floor
            </p>
          </div>
          <div className="space-y-2.5" role="radiogroup" aria-label="Bit depth">
            <SharpRadio
              selected={settings.bitDepth === '16-bit'}
              onSelect={() => onUpdateSettings({ bitDepth: '16-bit' })}
              label="16-bit PCM"
              description="96 dB dynamic floor · Delivery export"
            />
            <SharpRadio
              selected={settings.bitDepth === '24-bit'}
              onSelect={() => onUpdateSettings({ bitDepth: '24-bit' })}
              label="24-bit PCM"
              description="144 dB theoretical floor · Mixing standard"
            />
            <SharpRadio
              selected={settings.bitDepth === '32-bit float'}
              onSelect={() => onUpdateSettings({ bitDepth: '32-bit float' })}
              label="32-bit Floating Point"
              description="Clip-proof internal bus processing"
              accent
            />
          </div>
        </section>

        {/* Loudness Target */}
        <section className="bg-[#ffffff] border border-[#e5e5e5] p-6 space-y-4">
          <div className="border-b border-[#e5e5e5] pb-3">
            <h2 className="headline-sm text-[#000000]">Loudness Reference</h2>
            <p className="text-xs text-[#4c4546] mt-0.5">
              Integrated metering calibration curve
            </p>
          </div>
          <div className="space-y-2.5" role="radiogroup" aria-label="Loudness target">
            <SharpRadio
              selected={settings.loudnessTarget === '-14 LUFS'}
              onSelect={() => onUpdateSettings({ loudnessTarget: '-14 LUFS' })}
              label="-14 LUFS Integrated"
              description="Streaming & digital reference level"
              accent
            />
            <SharpRadio
              selected={settings.loudnessTarget === '-16 LUFS'}
              onSelect={() => onUpdateSettings({ loudnessTarget: '-16 LUFS' })}
              label="-16 LUFS Integrated"
              description="Broadcast stereo & podcast specification"
            />
            <SharpRadio
              selected={settings.loudnessTarget === '-23 LUFS'}
              onSelect={() => onUpdateSettings({ loudnessTarget: '-23 LUFS' })}
              label="-23 LUFS EBU R128"
              description="Wide dynamic cinema & archival norm"
            />
          </div>
        </section>
      </div>

      {/* Gain Staging & Test Oscillator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Linear Calibration Faders */}
        <section className="lg:col-span-7 bg-[#ffffff] border border-[#e5e5e5] p-6 space-y-6">
          <div className="border-b border-[#e5e5e5] pb-3 flex items-center justify-between">
            <div>
              <h2 className="headline-sm text-[#000000]">Output Trim &amp; Dynamics</h2>
              <p className="text-xs text-[#4c4546] mt-0.5">
                Live Web Audio bus calibration controls
              </p>
            </div>
            <span className="font-mono-tabular text-xs text-[#4c4546]">
              {settings.monitoringMode.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <LinearFader
              label="Master Trim"
              value={settings.masterTrimDb}
              min={-12}
              max={6}
              step={0.5}
              accent={settings.masterTrimDb !== 0}
              onChange={(val) => onUpdateSettings({ masterTrimDb: val })}
              formatValue={(val) => `${val > 0 ? '+' : ''}${val.toFixed(1)} dB`}
            />

            <LinearFader
              label="Limiter Ceiling"
              value={settings.limiterCeilingDb}
              min={-6}
              max={0}
              step={0.5}
              accent
              onChange={(val) => onUpdateSettings({ limiterCeilingDb: val })}
              formatValue={(val) => `${val.toFixed(1)} dBFS`}
            />

            <LinearFader
              label="Headphone Cue Mix"
              value={settings.headphoneCueMix}
              min={0}
              max={100}
              step={5}
              unit="%"
              onChange={(val) => onUpdateSettings({ headphoneCueMix: val })}
            />

            <LinearFader
              label="Metronome Click Gain"
              value={settings.clickVolume}
              min={0}
              max={100}
              step={5}
              unit="%"
              onChange={(val) => onUpdateSettings({ clickVolume: val })}
            />
          </div>

          <div className="pt-2 border-t border-[#e5e5e5] flex flex-wrap items-center justify-between gap-4">
            <span className="label-sm uppercase text-[#4c4546]">Monitoring Matrix</span>
            <div className="flex items-center border border-[#e5e5e5]">
              {(['stereo', 'mono', 'mid-side'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdateSettings({ monitoringMode: mode })}
                  className={`px-3.5 py-2 label-sm uppercase cursor-pointer transition-colors ${
                    settings.monitoringMode === mode
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'bg-[#ffffff] text-[#4c4546] hover:text-[#000000]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Reference Test Tone Oscillator */}
        <section className="lg:col-span-5 bg-[#ffffff] border border-[#e5e5e5] p-6 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="border-b border-[#e5e5e5] pb-3 flex items-center justify-between">
              <div>
                <h2 className="headline-sm text-[#000000]">Test Tone Generator</h2>
                <p className="text-xs text-[#4c4546] mt-0.5">
                  Audible reference signal for monitor calibration
                </p>
              </div>
              {activeTone ? (
                <Volume2 size={18} className="text-[#fd591e]" />
              ) : (
                <VolumeX size={18} className="text-[#7e7576]" />
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { id: '1khz', label: '1 kHz Sine' },
                  { id: 'pink', label: 'Pink Noise' },
                  { id: '60hz', label: '60 Hz Sub' },
                ] as const
              ).map((tone) => {
                const isRunning = activeTone === tone.id;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => toggleTone(tone.id)}
                    className={`py-3 px-2 border label-sm uppercase cursor-pointer transition-colors ${
                      isRunning
                        ? 'bg-[#fd591e] border-[#fd591e] text-[#ffffff]'
                        : 'bg-[#f9f9f9] border-[#e5e5e5] text-[#1a1c1c] hover:border-[#000000]'
                    }`}
                  >
                    {tone.label}
                  </button>
                );
              })}
            </div>

            <LinearFader
              label="Test Signal Trim"
              value={toneGain}
              min={5}
              max={80}
              step={5}
              unit="%"
              accent={Boolean(activeTone)}
              onChange={setToneGain}
            />
          </div>

          <div className="space-y-2 pt-4 border-t border-[#e5e5e5]">
            <div className="flex items-center justify-between text-xs">
              <span className="label-sm uppercase text-[#4c4546]">Bus Output Meter</span>
              <span className="font-mono-tabular text-[#1a1c1c]">
                {activeTone
                  ? `${Math.max(-60, 20 * Math.log10(Math.max(0.001, meterLevel))).toFixed(1)} dBFS`
                  : 'Idle'}
              </span>
            </div>
            <div className="h-3 bg-[#f3f3f3] border border-[#e5e5e5] relative overflow-hidden">
              <div
                style={{ width: `${Math.min(100, meterLevel * 140)}%` }}
                className={`h-full transition-[width] duration-75 ${
                  activeTone ? 'bg-[#fd591e]' : 'bg-[#000000]'
                }`}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
