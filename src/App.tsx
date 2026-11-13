import { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine } from './audio/audioEngine';
import { CalibrationScreen } from './components/CalibrationScreen';
import { InstrumentsScreen } from './components/InstrumentsScreen';
import { SessionLogScreen } from './components/SessionLogScreen';
import { StudioDeckScreen } from './components/StudioDeckScreen';
import { TopBar } from './components/TopBar';
import {
  INITIAL_CALIBRATION,
  INITIAL_CHANNELS,
  INITIAL_SESSION_TAKES,
  PATTERN_PRESETS,
} from './data/studioData';
import {
  CalibrationSettings,
  MixerChannel,
  RecordedTake,
  ScreenId,
  SessionTakeItem,
  StudioInstrument,
  TakeStatus,
} from './types/studio';

const TAKES_STORAGE_KEY = 'klangwerk_session_takes_v1';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('deck');
  const [channels, setChannels] = useState<MixerChannel[]>(INITIAL_CHANNELS);
  const [bpm, setBpm] = useState<number>(116);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(false);
  const [calibration, setCalibration] = useState<CalibrationSettings>(INITIAL_CALIBRATION);
  const [recordedTakes, setRecordedTakes] = useState<RecordedTake[]>([]);
  const [exporting, setExporting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [sessionTakes, setSessionTakes] = useState<SessionTakeItem[]>(() => {
    try {
      const saved = window.localStorage.getItem(TAKES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SessionTakeItem[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fall back to defaults
    }
    return INITIAL_SESSION_TAKES;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(TAKES_STORAGE_KEY, JSON.stringify(sessionTakes));
    } catch {
      // ignore storage quota errors
    }
  }, [sessionTakes]);

  // Keep refs for step scheduler closure
  const channelsRef = useRef(channels);
  channelsRef.current = channels;
  const metronomeRef = useRef(metronomeEnabled);
  metronomeRef.current = metronomeEnabled;
  const calibrationRef = useRef(calibration);
  calibrationRef.current = calibration;

  // Sync mixer gain/pan/filter nodes whenever settings change
  useEffect(() => {
    if (isPlaying) {
      audioEngine.syncChannels(
        channels,
        calibration.masterTrimDb,
        calibration.limiterCeilingDb
      );
    }
  }, [channels, calibration.masterTrimDb, calibration.limiterCeilingDb, isPlaying]);

  // Sequencer step loop
  useEffect(() => {
    if (!isPlaying) return;

    audioEngine.syncChannels(
      channelsRef.current,
      calibrationRef.current.masterTrimDb,
      calibrationRef.current.limiterCeilingDb
    );

    const stepIntervalMs = (60 / bpm / 4) * 1000;
    let stepIndex = currentStep;

    const triggerCurrentStep = (idx: number) => {
      channelsRef.current.forEach((ch) => {
        if (ch.steps[idx]) {
          audioEngine.triggerStep(ch, idx);
        }
      });
      if (metronomeRef.current && idx % 4 === 0) {
        audioEngine.triggerMetronome(
          idx === 0,
          calibrationRef.current.clickVolume
        );
      }
    };

    triggerCurrentStep(stepIndex);

    const id = window.setInterval(() => {
      stepIndex = (stepIndex + 1) % 16;
      setCurrentStep(stepIndex);
      triggerCurrentStep(stepIndex);
    }, stepIntervalMs);

    return () => window.clearInterval(id);
  }, [isPlaying, bpm]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  const handleUpdateChannel = useCallback(
    (id: string, patch: Partial<MixerChannel>) => {
      setChannels((prev) =>
        prev.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch))
      );
    },
    []
  );

  const handleToggleStep = useCallback((channelId: string, stepIndex: number) => {
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.id !== channelId) return ch;
        const nextSteps = [...ch.steps];
        nextSteps[stepIndex] = !nextSteps[stepIndex];
        return { ...ch, steps: nextSteps };
      })
    );
  }, []);

  const handleApplyPreset = useCallback(
    (presetName: string) => {
      const pattern = PATTERN_PRESETS[presetName];
      if (!pattern) return;
      setChannels((prev) =>
        prev.map((ch, idx) => ({
          ...ch,
          steps: pattern[idx] ? [...pattern[idx]] : ch.steps,
        }))
      );
      showToast(`Applied "${presetName}" sequencer matrix.`);
    },
    [showToast]
  );

  const handleLoadInstrumentToChannel = useCallback(
    (instrument: StudioInstrument, channelId: string) => {
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === channelId
            ? {
                ...ch,
                name: instrument.model,
                sourceLabel: instrument.specs.architecture,
                synthType: instrument.auditionSynth,
                loadedInstrumentId: instrument.id,
              }
            : ch
        )
      );
    },
    []
  );

  const handleAddRecordedTake = useCallback(
    (take: RecordedTake) => {
      setRecordedTakes((prev) => [take, ...prev]);
      showToast(`Captured ${take.title} (${take.durationSec.toFixed(1)}s).`);
    },
    [showToast]
  );

  const handleLogTakeToSession = useCallback(
    (take: RecordedTake) => {
      const nextNum = String(sessionTakes.length + 1).padStart(2, '0');
      const newEntry: SessionTakeItem = {
        id: `take-${Date.now()}`,
        code: `TK-${nextNum}`,
        title: take.title,
        timecode: take.createdAt + '.00',
        duration: `00:${String(Math.round(take.durationSec)).padStart(2, '0')}`,
        engineer: 'Studio Capture',
        status: 'Review',
        checked: false,
        notes: `Recorded via ${
          take.source === 'microphone' ? 'Microphone Input' : 'Master Bus'
        } at ${(take.sampleRate / 1000).toFixed(1)} kHz.`,
      };
      setSessionTakes((prev) => [newEntry, ...prev]);
      showToast(`Logged ${newEntry.code} to Session Log.`);
    },
    [sessionTakes.length, showToast]
  );

  const handleExportMix = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const wavBlob = await audioEngine.exportLoopToWav(channels, bpm);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `klangwerk_mix_${bpm}bpm.wav`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported 16-step mixdown (${bpm} BPM WAV).`);
    } catch {
      showToast('Unable to render WAV export.');
    } finally {
      setExporting(false);
    }
  }, [channels, bpm, exporting, showToast]);

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c] flex flex-col">
      <TopBar
        activeScreen={activeScreen}
        onSelectScreen={(screen) => {
          if (screen !== 'calibration') {
            audioEngine.stopTestTone();
          }
          setActiveScreen(screen);
        }}
        onExportMix={handleExportMix}
        exporting={exporting}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 md:px-8 lg:px-16 py-8 md:py-12">
        {activeScreen === 'deck' && (
          <StudioDeckScreen
            channels={channels}
            onUpdateChannel={handleUpdateChannel}
            onToggleStep={handleToggleStep}
            onApplyPreset={handleApplyPreset}
            bpm={bpm}
            onChangeBpm={setBpm}
            isPlaying={isPlaying}
            onTogglePlay={() => {
              if (!isPlaying) {
                audioEngine.ensureContext();
                audioEngine.syncChannels(
                  channels,
                  calibration.masterTrimDb,
                  calibration.limiterCeilingDb
                );
              }
              setIsPlaying((prev) => !prev);
            }}
            currentStep={currentStep}
            metronomeEnabled={metronomeEnabled}
            onToggleMetronome={() => setMetronomeEnabled((prev) => !prev)}
            calibration={calibration}
            recordedTakes={recordedTakes}
            onAddRecordedTake={handleAddRecordedTake}
            onLogTakeToSession={handleLogTakeToSession}
          />
        )}

        {activeScreen === 'instruments' && (
          <InstrumentsScreen
            channels={channels}
            onLoadInstrumentToChannel={handleLoadInstrumentToChannel}
            onNavigateToDeck={() => setActiveScreen('deck')}
          />
        )}

        {activeScreen === 'session-log' && (
          <SessionLogScreen
            takes={sessionTakes}
            onToggleChecked={(id) =>
              setSessionTakes((prev) =>
                prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t))
              )
            }
            onChangeStatus={(id, status: TakeStatus) =>
              setSessionTakes((prev) =>
                prev.map((t) => (t.id === id ? { ...t, status } : t))
              )
            }
            onAddTake={(newTake) => {
              const nextCode = `TK-${String(sessionTakes.length + 1).padStart(2, '0')}`;
              setSessionTakes((prev) => [
                { id: `take-${Date.now()}`, code: nextCode, ...newTake },
                ...prev,
              ]);
            }}
            onDeleteTake={(id) =>
              setSessionTakes((prev) => prev.filter((t) => t.id !== id))
            }
            onResetTakes={() => {
              setSessionTakes(INITIAL_SESSION_TAKES);
              showToast('Restored default studio session sheet.');
            }}
          />
        )}

        {activeScreen === 'calibration' && (
          <CalibrationScreen
            settings={calibration}
            onUpdateSettings={(patch) =>
              setCalibration((prev) => ({ ...prev, ...patch }))
            }
            onResetDefaults={() => {
              setCalibration(INITIAL_CALIBRATION);
              showToast('Calibration restored to studio reference defaults.');
            }}
          />
        )}
      </main>

      {/* Transient Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-40 bg-[#000000] text-[#ffffff] border border-[#000000] px-4 py-3 text-xs font-display tracking-wide flex items-center gap-3"
        >
          <span className="w-2 h-2 bg-[#fd591e] shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Clean Minimal Footer */}
      <footer className="border-t border-[#e5e5e5] bg-[#f9f9f9]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#4c4546]">
          <div className="font-display font-medium text-[#1a1c1c]">
            Klangwerk Studio
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveScreen('deck')}
              className="hover:text-[#000000] cursor-pointer"
            >
              Studio Deck
            </button>
            <button
              type="button"
              onClick={() => setActiveScreen('instruments')}
              className="hover:text-[#000000] cursor-pointer"
            >
              Instruments
            </button>
            <button
              type="button"
              onClick={() => setActiveScreen('session-log')}
              className="hover:text-[#000000] cursor-pointer"
            >
              Session Log
            </button>
            <button
              type="button"
              onClick={() => setActiveScreen('calibration')}
              className="hover:text-[#000000] cursor-pointer"
            >
              Calibration
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
