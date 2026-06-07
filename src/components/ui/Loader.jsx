import React from 'react';
import { Flame } from 'lucide-react';

export default function Loader({ text = "Chargement..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative flex items-end justify-center w-48 h-28 mb-6">
        
        {/* Fireman & Extinguisher SVG */}
        <div className="absolute left-2 bottom-0 animate-extinguisher-shake z-10">
          <svg width="60" height="80" viewBox="0 0 64 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Fireman Hat */}
            <path d="M16 32 C 16 10, 48 10, 48 32 Z" fill="#FFC107" />
            <path d="M10 32 L 54 32 L 50 38 L 14 38 Z" fill="#333" />
            {/* Head */}
            <circle cx="32" cy="46" r="12" fill="#FFD2A6" />
            {/* Body */}
            <path d="M20 58 L 44 58 L 48 80 L 16 80 Z" fill="#2C3E50" />
            {/* Extinguisher Cylinder */}
            <rect x="38" y="48" width="16" height="30" rx="4" fill="#E63946" />
            <rect x="38" y="52" width="16" height="4" fill="#fff" opacity="0.8" />
            {/* Hose/Nozzle */}
            <path d="M46 50 Q 65 35, 75 45" stroke="#333" strokeWidth="4" fill="none" />
            {/* Extinguisher Top/Handle */}
            <rect x="42" y="44" width="8" height="4" fill="#333" />
            <path d="M42 44 L 38 40 L 46 40" stroke="#333" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Water/Foam Particles Animation */}
        <div className="absolute left-[85px] bottom-10 w-24 h-12 overflow-hidden z-20">
          <div className="water-particle w-3 h-3 bg-blue-400 rounded-full absolute top-2 left-0 opacity-0"></div>
          <div className="water-particle w-4 h-4 bg-blue-300 rounded-full absolute top-4 left-4 opacity-0" style={{ animationDelay: '0.3s' }}></div>
          <div className="water-particle w-3 h-3 bg-sky-200 rounded-full absolute top-1 left-8 opacity-0" style={{ animationDelay: '0.6s' }}></div>
          <div className="water-particle w-2 h-2 bg-blue-500 rounded-full absolute top-6 left-2 opacity-0" style={{ animationDelay: '0.9s' }}></div>
        </div>

        {/* Flame Animation */}
        <div className="absolute right-4 bottom-0 text-orange-500 animate-flame-shrink">
          <Flame size={56} className="animate-flame-flicker drop-shadow-lg" fill="currentColor" />
        </div>
        
      </div>
      <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse text-lg">{text}</p>
    </div>
  );
}
