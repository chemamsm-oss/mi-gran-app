
import React, { useState, useEffect } from 'react';

interface TimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
  isActive: boolean;
  isPaused: boolean;
}

const Timer: React.FC<TimerProps> = ({ initialSeconds, onTimeUp, isActive, isPaused }) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && !isPaused && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => {
          if (s - 1 === 60) {
            playBeep();
          }
          return s - 1;
        });
      }, 1000);
    } else if (seconds === 0) {
      onTimeUp();
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, seconds, onTimeUp]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center space-x-2 px-4 py-1.5 rounded border font-mono text-lg font-bold transition-all duration-300 ${
      isPaused ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
      seconds < 60 ? 'bg-red-600 text-white border-red-700 animate-pulse' : 
      'bg-blue-700 text-white border-blue-800 shadow-inner'
    }`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{formatTime(seconds)}</span>
    </div>
  );
};

export default Timer;
