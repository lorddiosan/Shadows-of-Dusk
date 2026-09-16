import React, { useEffect, useRef } from 'react';
import warRoomBg from '../../assets/war_room_bg.jpg';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  color: string;
  wobbleSpeed: number;
  wobbleAmplitude: number;
  wobbleOffset: number;
}

export const WarRoomBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle Pools: Embers from braziers + Celestial starlight
    const embers: Particle[] = [];
    const EMBER_COUNT = 45;

    const createEmber = (initial = false): Particle => {
      // Spawn near lower rampart fires (left brazier ~20%, right brazier ~35%, or general bottom)
      const spawnX = Math.random() < 0.6
        ? width * (0.12 + Math.random() * 0.3)
        : width * Math.random();
      const spawnY = initial ? height * (0.4 + Math.random() * 0.6) : height * (0.75 + Math.random() * 0.25);

      const colors = ['#f59e0b', '#ef4444', '#f97316', '#fbbf24', '#ffedd5'];
      const maxLife = 120 + Math.random() * 160;

      return {
        x: spawnX,
        y: spawnY,
        vx: (Math.random() - 0.4) * 0.8,
        vy: -(0.8 + Math.random() * 1.5),
        size: 1.2 + Math.random() * 2.2,
        alpha: 0,
        maxAlpha: 0.4 + Math.random() * 0.5,
        life: initial ? Math.random() * maxLife : 0,
        maxLife,
        color: colors[Math.floor(Math.random() * colors.length)],
        wobbleSpeed: 0.02 + Math.random() * 0.04,
        wobbleAmplitude: 0.6 + Math.random() * 1.2,
        wobbleOffset: Math.random() * Math.PI * 2
      };
    };

    for (let i = 0; i < EMBER_COUNT; i++) {
      embers.push(createEmber(true));
    }

    // Stars / Aether motes in upper sky
    interface Star {
      x: number;
      y: number;
      size: number;
      baseAlpha: number;
      twinkleSpeed: number;
      color: string;
    }
    const stars: Star[] = [];
    const STAR_COUNT = 55;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: width * Math.random(),
        y: height * 0.55 * Math.random(),
        size: 0.8 + Math.random() * 1.8,
        baseAlpha: 0.2 + Math.random() * 0.6,
        twinkleSpeed: 0.015 + Math.random() * 0.03,
        color: Math.random() > 0.4 ? '#e0e7ff' : '#c084fc'
      });
    }

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Twinkling Starlight
      for (const star of stars) {
        const twinkle = Math.sin(frame * star.twinkleSpeed) * 0.35;
        const alpha = Math.max(0.05, Math.min(1, star.baseAlpha + twinkle));
        ctx.save();
        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = star.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Draw Ascending Fire Embers
      for (let i = 0; i < embers.length; i++) {
        const p = embers[i];
        p.life++;

        // Calculate fade-in and fade-out
        const halfLife = p.maxLife / 2;
        if (p.life < halfLife) {
          p.alpha = (p.life / halfLife) * p.maxAlpha;
        } else {
          p.alpha = Math.max(0, (1 - (p.life - halfLife) / halfLife) * p.maxAlpha);
        }

        // Horizontal sinusoidal drift
        p.x += p.vx + Math.sin(frame * p.wobbleSpeed + p.wobbleOffset) * p.wobbleAmplitude;
        p.y += p.vy;

        if (p.life >= p.maxLife || p.y < 0) {
          embers[i] = createEmber(false);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      {/* Base Artwork with slow breathing cinematic zoom & pan */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center origin-center transition-transform duration-1000 ease-out"
        style={{
          backgroundImage: `url(${warRoomBg})`,
          animation: 'warRoomCinematicDrift 28s ease-in-out infinite alternate',
          transformOrigin: '55% 40%'
        }}
      />

      {/* Pulsing Celestial Convergence Rift Glow Overlay (Positioned directly over the cosmic fracture) */}
      <div 
        className="absolute top-[5%] right-[20%] w-[500px] h-[500px] -translate-y-1/4 rounded-full pointer-events-none opacity-40 mix-blend-screen filter blur-3xl animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.7) 0%, rgba(239,68,68,0.4) 40%, rgba(59,130,246,0.15) 70%, transparent 85%)',
          animationDuration: '5s'
        }}
      />

      {/* Atmospheric Vignette & Color Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060403] via-[#060403]/30 to-transparent opacity-95" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#060403]/85 via-transparent to-[#060403]/60" />
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.85)]" />

      {/* Particle Simulation Canvas (Embers & Starlight) */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Inline Keyframe Styles for Cinematic Drift */}
      <style>{`
        @keyframes warRoomCinematicDrift {
          0% {
            transform: scale(1.0) translate(0px, 0px);
          }
          50% {
            transform: scale(1.04) translate(-10px, -6px);
          }
          100% {
            transform: scale(1.02) translate(8px, -3px);
          }
        }
      `}</style>
    </div>
  );
};
