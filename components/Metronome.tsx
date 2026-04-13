import React, { useState, useEffect, useRef, useCallback } from 'react';

interface MetronomeProps {
  isPlaying: boolean;
}

const Metronome: React.FC<MetronomeProps> = ({ isPlaying }) => {
  const [isActive, setIsActive] = useState(false);
  const [bpm, setBpm] = useState(250); // Default to 250 strokes per minute
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const timerIDRef = useRef<number | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playClick = (time: number) => {
    if (!audioContextRef.current) return;
    
    const osc = audioContextRef.current.createOscillator();
    const envelope = audioContextRef.current.createGain();

    osc.frequency.value = 800;
    envelope.gain.value = 1;
    envelope.gain.exponentialRampToValueAtTime(1, time + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    osc.connect(envelope);
    envelope.connect(audioContextRef.current.destination);

    osc.start(time);
    osc.stop(time + 0.03);
  };

  const scheduler = useCallback(() => {
    if (!audioContextRef.current) return;
    
    // Schedule notes up to 0.1 seconds in the future
    while (nextNoteTimeRef.current < audioContextRef.current.currentTime + 0.1) {
      playClick(nextNoteTimeRef.current);
      nextNoteTimeRef.current += 60.0 / bpm;
    }
    timerIDRef.current = window.setTimeout(scheduler, 25);
  }, [bpm]);

  useEffect(() => {
    if (isActive && isPlaying) {
      initAudioContext();
      if (audioContextRef.current) {
        // Start playing 0.05s from now
        nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.05;
        scheduler();
      }
    } else {
      if (timerIDRef.current !== null) {
        window.clearTimeout(timerIDRef.current);
        timerIDRef.current = null;
      }
    }

    return () => {
      if (timerIDRef.current !== null) {
        window.clearTimeout(timerIDRef.current);
      }
    };
  }, [isActive, isPlaying, scheduler]);

  const toggleMetronome = () => {
    if (!isActive) {
      initAudioContext();
    }
    setIsActive(!isActive);
  };

  return (
    <div className="flex items-center space-x-3 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
      <button 
        onClick={toggleMetronome}
        className={`p-1.5 rounded-md transition-colors flex items-center justify-center ${isActive ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/20 text-white hover:bg-white/30'}`}
        title="Activar/Desactivar Metrónomo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M8 2h8M5 22h14M12 14l-4-4"/>
        </svg>
      </button>
      
      {isActive && (
        <div className="flex items-center space-x-2">
          <input 
            type="range" 
            min="100" 
            max="600" 
            step="10"
            value={bpm} 
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[10px] font-bold text-white w-12 text-right">{bpm} PPM</span>
        </div>
      )}
    </div>
  );
};

export default Metronome;
