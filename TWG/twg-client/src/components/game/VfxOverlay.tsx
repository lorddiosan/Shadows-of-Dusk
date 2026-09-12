import React, { useState, useEffect } from 'react';
import { vfxDispatcher, VfxEvent } from '../../services/audioVfxService';

interface ActiveVfx extends VfxEvent {
  startTime: number;
}

export const VfxOverlay: React.FC = () => {
  const [activeEffects, setActiveEffects] = useState<ActiveVfx[]>([]);

  useEffect(() => {
    const unsubscribe = vfxDispatcher.subscribe((event) => {
      const effect: ActiveVfx = {
        ...event,
        startTime: Date.now()
      };
      setActiveEffects(prev => [...prev, effect]);

      // Schedule removal
      const duration = event.durationMs || 500;
      setTimeout(() => {
        setActiveEffects(prev => prev.filter(e => e.id !== effect.id));
      }, duration);
    });

    return () => unsubscribe();
  }, []);

  if (activeEffects.length === 0) return null;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
      <defs>
        {/* Glow Filters */}
        <filter id="vfx-glow-gold" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="vfx-glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="vfx-glow-rose" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Gradients */}
        <linearGradient id="vfx-laser-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2" />
        </linearGradient>

        <linearGradient id="vfx-slash-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>

      {activeEffects.map(effect => {
        // --- 1. SHOOT PROJECTILE VFX ---
        if (effect.type === 'shoot_projectile' && effect.from && effect.to) {
          const { from, to, color = '#f59e0b', variant = 'ballistic' } = effect;
          const isLaser = variant === 'laser';
          const isPlasma = variant === 'plasma';

          return (
            <g key={effect.id} className="animate-in fade-in duration-75">
              {/* Muzzle Flash Burst at Shooter */}
              <circle
                cx={from.x}
                cy={from.y}
                r="18"
                fill={color}
                opacity="0.75"
                filter="url(#vfx-glow-gold)"
                className="animate-ping"
              />
              <circle cx={from.x} cy={from.y} r="8" fill="#fff" />

              {/* Laser / Tracer Beam Line */}
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isLaser ? '#38bdf8' : isPlasma ? '#c084fc' : color}
                strokeWidth={isPlasma ? "6" : isLaser ? "4" : "3"}
                strokeLinecap="round"
                opacity="0.9"
                filter="url(#vfx-glow-gold)"
              />

              {/* Bright Core Beam */}
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#ffffff"
                strokeWidth={isPlasma ? "3" : "1.5"}
                strokeLinecap="round"
                strokeDasharray={isLaser ? "none" : "16 8"}
              />

              {/* Impact Spark Burst at Target */}
              <g transform={`translate(${to.x}, ${to.y})`}>
                <circle r="22" fill={color} opacity="0.6" className="animate-ping" />
                <circle r="12" fill="#fff" opacity="0.9" />
                {/* Cross Sparks */}
                <line x1="-16" y1="-16" x2="16" y2="16" stroke="#fff" strokeWidth="2.5" />
                <line x1="16" y1="-16" x2="-16" y2="16" stroke="#fff" strokeWidth="2.5" />
                <line x1="-20" y1="0" x2="20" y2="0" stroke={color} strokeWidth="2" />
                <line x1="0" y1="-20" x2="0" y2="20" stroke={color} strokeWidth="2" />
              </g>
            </g>
          );
        }

        // --- 2. MELEE SLASH VFX ---
        if (effect.type === 'melee_slash' && effect.position) {
          const { position, color = '#fbbf24', variant = 'slash' } = effect;
          const isCrush = variant === 'crush';

          return (
            <g key={effect.id} transform={`translate(${position.x}, ${position.y})`}>
              {isCrush ? (
                /* Blunt Hammer Shockwave / Impact Crater */
                <>
                  <circle r="36" fill="rgba(245, 158, 11, 0.3)" stroke="#f59e0b" strokeWidth="3" className="animate-ping" />
                  <circle r="18" fill="#fff" opacity="0.8" />
                  <path
                    d="M -24 -24 L 24 24 M -24 24 L 24 -24 M -30 0 L 30 0 M 0 -30 L 0 30"
                    stroke="#fbbf24"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                /* Sweeping Curved Energy Blade Slash */
                <>
                  {/* Primary Slash Arc */}
                  <path
                    d="M -35 -30 Q 5 -5, 38 32"
                    fill="none"
                    stroke={color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#vfx-glow-gold)"
                  />
                  <path
                    d="M -35 -30 Q 5 -5, 38 32"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Secondary Counter Cross-Slash Arc */}
                  <path
                    d="M 32 -30 Q -5 -5, -35 32"
                    fill="none"
                    stroke={color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.75"
                  />

                  {/* Central Critical Hit Flash */}
                  <circle r="10" fill="#fff" className="animate-ping" />
                  <circle r="5" fill={color} />
                </>
              )}
            </g>
          );
        }

        // --- 3. ABILITY AURA VFX ---
        if (effect.type === 'ability_aura' && effect.position) {
          const { position, color = '#f59e0b', icon = '⚡', label = 'Ability' } = effect;

          return (
            <g key={effect.id} transform={`translate(${position.x}, ${position.y})`}>
              {/* Expanding Concentric Aura Rings */}
              <circle
                r="70"
                fill="none"
                stroke={color}
                strokeWidth="3"
                opacity="0.7"
                filter="url(#vfx-glow-gold)"
                className="animate-ping"
              />
              <circle
                r="45"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.85"
              />
              <circle
                r="25"
                fill={color}
                opacity="0.25"
              />

              {/* Floating Upward Ability Badge / Rune */}
              <g transform="translate(0, -45)">
                <rect
                  x="-65"
                  y="-14"
                  width="130"
                  height="26"
                  rx="13"
                  fill="#0b0f19"
                  stroke={color}
                  strokeWidth="2"
                  filter="url(#vfx-glow-gold)"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {icon} {label}
                </text>
              </g>
            </g>
          );
        }

        // --- 4. FREE CP GENERATION SPARKLE ---
        if (effect.type === 'cp_sparkle' && effect.position) {
          const { position } = effect;

          return (
            <g key={effect.id} transform={`translate(${position.x}, ${position.y})`}>
              {/* Golden Ring Pulse */}
              <circle r="50" fill="none" stroke="#fbbf24" strokeWidth="3" opacity="0.8" className="animate-ping" />
              <circle r="30" fill="rgba(251, 191, 36, 0.25)" />

              {/* Floating +1 CP Badge */}
              <g transform="translate(0, -50)">
                <rect
                  x="-45"
                  y="-15"
                  width="90"
                  height="28"
                  rx="14"
                  fill="#0f1422"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  filter="url(#vfx-glow-gold)"
                />
                <text
                  x="0"
                  y="4.5"
                  textAnchor="middle"
                  fill="#fbbf24"
                  fontSize="12"
                  fontFamily="monospace"
                  fontWeight="900"
                >
                  ⭐ +1 CP!
                </text>
              </g>
            </g>
          );
        }

        return null;
      })}
    </svg>
  );
};
