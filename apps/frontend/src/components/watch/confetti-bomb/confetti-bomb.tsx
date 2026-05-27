"use client";

import { useEffect, useRef } from "react";

type ConfettiBombProps = {
  active: boolean;
  onComplete?: () => void;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: "rect" | "circle";
};

const COLORS = [
  "#ff0000", "#ff4400", "#ff8800", "#ffcc00",
  "#88ff00", "#00ff44", "#00ffcc", "#00ccff",
  "#0088ff", "#0044ff", "#4400ff", "#8800ff",
  "#cc00ff", "#ff00cc", "#ff0088", "#ff0044",
];

export default function ConfettiBomb({ active, onComplete }: ConfettiBombProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const particles: Particle[] = [];
    const count = 150;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 4 + Math.random() * 8;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        opacity: 1,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      });
    }

    particlesRef.current = particles;
    startTimeRef.current = Date.now();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const elapsed = Date.now() - startTimeRef.current;

      particlesRef.current = particlesRef.current.filter((p) => p.opacity > 0);

      if (particlesRef.current.length === 0 && elapsed > 2000) {
        cancelAnimationFrame(animationRef.current);
        onComplete?.();
        return;
      }

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;

        if (elapsed > 1500) {
          p.opacity = Math.max(0, p.opacity - 0.03);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[60]"
    />
  );
}
