import { ChannelSynthesisType, MixerChannel, RecordedTake } from '../types/studio';

interface ChannelNodes {
  gain: GainNode;
  pan: StereoPannerNode;
  filter: BiquadFilterNode;
  analyser: AnalyserNode;
}

class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private channelNodes: Map<string, ChannelNodes> = new Map();
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordStartTime = 0;
  private micStream: MediaStream | null = null;

  private activeTestOsc: OscillatorNode | null = null;
  private activeTestNoise: AudioBufferSourceNode | null = null;
  private activeTestGain: GainNode | null = null;

  public ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;

      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -1.5;
      this.limiter.knee.value = 2;
      this.limiter.ratio.value = 12;
      this.limiter.attack.value = 0.002;
      this.limiter.release.value = 0.12;

      this.masterAnalyser = this.ctx.createAnalyser();
      this.masterAnalyser.fftSize = 1024;
      this.masterAnalyser.smoothingTimeConstant = 0.78;

      this.streamDest = this.ctx.createMediaStreamDestination();

      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.ctx.destination);
      this.masterAnalyser.connect(this.streamDest);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    return this.ctx;
  }

  public syncChannels(channels: MixerChannel[], masterTrimDb = 0, limiterCeilingDb = -1.0) {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    if (this.masterGain) {
      const linearTrim = Math.pow(10, masterTrimDb / 20) * 0.85;
      this.masterGain.gain.setTargetAtTime(Math.max(0.01, Math.min(1.8, linearTrim)), now, 0.02);
    }
    if (this.limiter) {
      this.limiter.threshold.setTargetAtTime(limiterCeilingDb, now, 0.02);
    }

    const anySolo = channels.some((c) => c.solo);

    channels.forEach((ch) => {
      let nodes = this.channelNodes.get(ch.id);
      if (!nodes && this.masterGain) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 1.1;

        const pan = ctx.createStereoPanner();
        const gain = ctx.createGain();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;

        filter.connect(pan);
        pan.connect(gain);
        gain.connect(analyser);
        analyser.connect(this.masterGain);

        nodes = { filter, pan, gain, analyser };
        this.channelNodes.set(ch.id, nodes);
      }

      if (nodes) {
        const audible = !ch.muted && (!anySolo || ch.solo);
        const linearGain = audible ? Math.pow(ch.gain / 100, 1.6) * 0.9 : 0;
        nodes.gain.gain.setTargetAtTime(linearGain, now, 0.02);
        nodes.pan.pan.setTargetAtTime(ch.pan / 100, now, 0.02);
        nodes.filter.frequency.setTargetAtTime(ch.cutoff, now, 0.03);
      }
    });
  }

  public triggerStep(channel: MixerChannel, stepIndex: number) {
    const ctx = this.ensureContext();
    const nodes = this.channelNodes.get(channel.id);
    if (!nodes) return;

    const now = ctx.currentTime;
    this.playSynthVoice(ctx, nodes.filter, channel.synthType, now, stepIndex);
  }

  public triggerMetronome(isDownbeat: boolean, volumePercent: number) {
    if (volumePercent <= 0) return;
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isDownbeat ? 1320 : 880, now);

    const amp = (volumePercent / 100) * 0.22;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(amp, now + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public auditionInstrument(synthType: ChannelSynthesisType, freq: number) {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    const tempFilter = ctx.createBiquadFilter();
    tempFilter.type = 'lowpass';
    tempFilter.frequency.setValueAtTime(5200, now);
    tempFilter.connect(this.masterGain);

    this.playSynthVoice(ctx, tempFilter, synthType, now, 0, freq);
  }

  private playSynthVoice(
    ctx: AudioContext,
    destination: AudioNode,
    synthType: ChannelSynthesisType,
    now: number,
    stepIndex: number,
    overrideFreq?: number
  ) {
    if (synthType === 'sub-bass') {
      const notes = [55, 55, 65.41, 73.42, 55, 82.41, 65.41, 49];
      const baseFreq = overrideFreq ?? notes[stepIndex % notes.length];
      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 1.4, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.03);

      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.55, now + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

      osc.connect(env);
      env.connect(destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (synthType === 'percussion') {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      const f = overrideFreq ?? (stepIndex % 4 === 2 ? 420 : 690);
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.045);

      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.45, now + 0.002);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

      osc.connect(env);
      env.connect(destination);
      osc.start(now);
      osc.stop(now + 0.085);

      // Short transient click burst
      const bufferSize = Math.floor(ctx.sampleRate * 0.03);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.28, now);
      noise.connect(noiseGain);
      noiseGain.connect(destination);
      noise.start(now);
    } else if (synthType === 'fm-chime') {
      const scale = [220, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
      const carrierFreq = overrideFreq ?? scale[(stepIndex * 3) % scale.length];

      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const env = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(carrierFreq, now);

      mod.type = 'sine';
      mod.frequency.setValueAtTime(carrierFreq * 2.0, now);
      modGain.gain.setValueAtTime(carrierFreq * 1.1, now);
      modGain.gain.exponentialRampToValueAtTime(12, now + 0.25);

      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.32, now + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(env);
      env.connect(destination);

      mod.start(now);
      carrier.start(now);
      mod.stop(now + 0.44);
      carrier.stop(now + 0.44);
    } else {
      // tape-texture
      const dur = 0.28;
      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.04 * white) / 1.04;
        data[i] = lastOut * 2.2;
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(overrideFreq ?? 640, now);
      bp.Q.setValueAtTime(1.8, now);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.28, now + 0.04);
      env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      src.connect(bp);
      bp.connect(env);
      env.connect(destination);
      src.start(now);
    }
  }

  public getWaveformData(target: Uint8Array<ArrayBuffer>): boolean {
    if (!this.masterAnalyser) return false;
    this.masterAnalyser.getByteTimeDomainData(target);
    return true;
  }

  public getFrequencyData(target: Uint8Array<ArrayBuffer>): boolean {
    if (!this.masterAnalyser) return false;
    this.masterAnalyser.getByteFrequencyData(target);
    return true;
  }

  public getMasterPeakLevel(): number {
    if (!this.masterAnalyser) return 0;
    const data = new Uint8Array(this.masterAnalyser.fftSize);
    this.masterAnalyser.getByteTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const norm = Math.abs((data[i] - 128) / 128);
      if (norm > peak) peak = norm;
    }
    return peak;
  }

  public getChannelLevel(channelId: string): number {
    const nodes = this.channelNodes.get(channelId);
    if (!nodes) return 0;
    const data = new Uint8Array(nodes.analyser.fftSize);
    nodes.analyser.getByteTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const norm = Math.abs((data[i] - 128) / 128);
      if (norm > peak) peak = norm;
    }
    return peak;
  }

  public startTestTone(mode: '1khz' | 'pink' | '60hz', gainPercent: number) {
    this.stopTestTone();
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime((gainPercent / 100) * 0.25, now);
    gain.connect(this.masterGain);
    this.activeTestGain = gain;

    if (mode === '1khz' || mode === '60hz') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(mode === '1khz' ? 1000 : 60, now);
      osc.connect(gain);
      osc.start(now);
      this.activeTestOsc = osc;
    } else {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noise.connect(gain);
      noise.start(now);
      this.activeTestNoise = noise;
    }
  }

  public stopTestTone() {
    try {
      this.activeTestOsc?.stop();
      this.activeTestOsc?.disconnect();
    } catch {
      // ignore already stopped
    }
    try {
      this.activeTestNoise?.stop();
      this.activeTestNoise?.disconnect();
    } catch {
      // ignore already stopped
    }
    this.activeTestGain?.disconnect();
    this.activeTestOsc = null;
    this.activeTestNoise = null;
    this.activeTestGain = null;
  }

  public async startRecording(): Promise<'microphone' | 'internal-bus'> {
    const ctx = this.ensureContext();
    this.recordedChunks = [];
    this.recordStartTime = performance.now();

    let streamToRecord: MediaStream | null = null;
    let sourceType: 'microphone' | 'internal-bus' = 'internal-bus';

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamToRecord = this.micStream;
        sourceType = 'microphone';
      } catch {
        // Microphone denied or unavailable: fall back cleanly to internal master bus recording
        streamToRecord = this.streamDest?.stream ?? null;
        sourceType = 'internal-bus';
      }
    } else {
      streamToRecord = this.streamDest?.stream ?? null;
    }

    if (!streamToRecord) {
      throw new Error('Audio stream unavailable for recording.');
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(streamToRecord, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };
    this.mediaRecorder.start(100);

    // keep reference to context sampleRate
    void ctx.sampleRate;
    return sourceType;
  }

  public stopRecording(sourceType: 'microphone' | 'internal-bus'): Promise<RecordedTake | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      const recorder = this.mediaRecorder;
      const durationSec = Math.max(0.5, (performance.now() - this.recordStartTime) / 1000);

      recorder.onstop = () => {
        if (this.micStream) {
          this.micStream.getTracks().forEach((t) => t.stop());
          this.micStream = null;
        }
        if (this.recordedChunks.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(this.recordedChunks, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const now = new Date();
        const timestamp = now.toTimeString().slice(0, 8);
        resolve({
          id: `rec-${Date.now()}`,
          title: sourceType === 'microphone' ? `Mic Capture ${timestamp}` : `Bus Mixdown ${timestamp}`,
          durationSec,
          createdAt: timestamp,
          source: sourceType,
          url,
          sampleRate: this.ctx?.sampleRate ?? 48000,
        });
      };

      recorder.stop();
    });
  }

  public async exportLoopToWav(channels: MixerChannel[], bpm: number): Promise<Blob> {
    const sampleRate = 44100;
    const stepDur = 60 / bpm / 4;
    const totalSteps = 16;
    const duration = stepDur * totalSteps + 0.5;
    const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);

    const master = offline.createGain();
    master.gain.value = 0.85;
    master.connect(offline.destination);

    const anySolo = channels.some((c) => c.solo);

    channels.forEach((ch) => {
      const audible = !ch.muted && (!anySolo || ch.solo);
      if (!audible) return;

      const filter = offline.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = ch.cutoff;

      const pan = offline.createStereoPanner();
      pan.pan.value = ch.pan / 100;

      const gain = offline.createGain();
      gain.gain.value = Math.pow(ch.gain / 100, 1.6) * 0.9;

      filter.connect(pan);
      pan.connect(gain);
      gain.connect(master);

      ch.steps.forEach((active, idx) => {
        if (active) {
          this.playSynthVoice(
            offline as unknown as AudioContext,
            filter,
            ch.synthType,
            idx * stepDur,
            idx
          );
        }
      });
    });

    const rendered = await offline.startRendering();
    return audioBufferToWavBlob(rendered);
  }
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length * numChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, length - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length - 44, true);

  const channels = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export const audioEngine = new StudioAudioEngine();
