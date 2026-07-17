import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  scale: number;
  shape: 'rect' | 'circle';
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

function createParticle(id: number): Particle {
  return {
    id,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    rotation: Math.random() * 360,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    scale: 0.4 + Math.random() * 0.6,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  };
}

export default function Confetti({ active, duration = 2500 }: { active: boolean; duration?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }
    const count = 40;
    const initial = Array.from({ length: count }, (_, i) => createParticle(i));
    setParticles(initial);

    const timer = setTimeout(() => setParticles([]), duration);
    return () => clearTimeout(timer);
  }, [active, duration]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            initial={{ y: '-10vh', rotate: 0, opacity: 1, scale: p.scale }}
            animate={{
              y: '110vh',
              rotate: p.rotation * 3,
              opacity: [1, 0.8, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.5 + Math.random() * 1.5,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            {p.shape === 'circle' ? (
              <div
                className="rounded-full"
                style={{
                  width: `${8 + Math.random() * 8}px`,
                  height: `${8 + Math.random() * 8}px`,
                  backgroundColor: p.color,
                }}
              />
            ) : (
              <div
                className="rounded-sm"
                style={{
                  width: `${6 + Math.random() * 6}px`,
                  height: `${10 + Math.random() * 8}px`,
                  backgroundColor: p.color,
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
