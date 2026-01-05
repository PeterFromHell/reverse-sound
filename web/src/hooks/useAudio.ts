import { useState, useRef, useEffect } from 'react';
import { bufferToWav } from '../utils/wavEncoder';

export interface AudioState {
  isRecording: boolean;
  isPlaying: boolean;
  hasAudio: boolean;
  duration: number;
  currentTime: number;
}

export const useAudio = () => {
  const [state, setState] = useState<AudioState>({
    isRecording: false,
    isPlaying: false,
    hasAudio: false,
    duration: 0,
    currentTime: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    // Initialize AudioContext
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;

    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup Analyser for visualization during recording
      if (audioContextRef.current && analyserRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await processAudio(blob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setState(prev => ({ ...prev, isRecording: true, hasAudio: false }));
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setState(prev => ({ ...prev, isRecording: false }));
    }
  };

  const processAudio = async (blob: Blob) => {
    if (!audioContextRef.current) return;

    const arrayBuffer = await blob.arrayBuffer();
    const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
    audioBufferRef.current = decodedBuffer;

    setState(prev => ({
      ...prev,
      hasAudio: true,
      duration: decodedBuffer.duration
    }));
  };

  const reverseAudio = () => {
    if (!audioBufferRef.current) return;

    const buffer = audioBufferRef.current;

    // Reverse logic for each channel
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const channelData = buffer.getChannelData(i);
      // In-place reverse
      channelData.reverse();
    }

    setState(prev => ({ ...prev })); // Trigger re-render if needed
  };

  const playAudio = () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    // Stop if currently playing
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) { /* ignore */ }
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;

    // Connect to analyser for playback visualization
    if (analyserRef.current) {
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    } else {
      source.connect(audioContextRef.current.destination);
    }

    source.onended = () => {
      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
      cancelAnimationFrame(animationFrameRef.current);
    };

    sourceNodeRef.current = source;
    source.start(0);
    startTimeRef.current = audioContextRef.current.currentTime;

    setState(prev => ({ ...prev, isPlaying: true }));
    updateProgress();
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) { /* already stopped */ }
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const updateProgress = () => {
    if (!audioContextRef.current) return;

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    setState(prev => ({ ...prev, currentTime: elapsed }));

    if (elapsed < (audioBufferRef.current?.duration || 0)) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const downloadAudio = () => {
    if (!audioBufferRef.current) return;

    const blob = bufferToWav(audioBufferRef.current);
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'reversed-audio.wav';
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return {
    state,
    startRecording,
    stopRecording,
    reverseAudio,
    playAudio,
    stopPlayback,
    downloadAudio,
    analyser: analyserRef.current
  };
};
