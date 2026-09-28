"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/components/marketing/cinematic/motion-hooks";

type Node = { x: number; y: number; vx: number; vy: number; r: number; hue: 0 | 1 };

/**
 * Drifting constellation of data nodes with proximity links.
 * Runs only while visible + tab focused; static dots under reduced motion.
 */
export function ParticleField({
  className,
  density = 1,
  color = "24, 119, 242",
  accent = "228, 30, 63"
}: {
  className?: string;
  density?: number;
  color?: string;
  accent?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let nodes: Node[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
    let frame = 0;
    let visible = true;
    let pointer = { x: -9999, y: -9999 };

    const seed = () => {
      const area = (w * h) / 14000;
      const count = Math.max(28, Math.min(120, Math.round(area * density)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 0.8 + Math.random() * 1.6,
        hue: Math.random() < 0.14 ? 1 : 0
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduced) draw(false);
    };

    const draw = (animate: boolean) => {
      ctx.clearRect(0, 0, w, h);
      const linkDist = Math.min(150, Math.max(90, w / 9));

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (animate) {
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < -10) a.x = w + 10;
          else if (a.x > w + 10) a.x = -10;
          if (a.y < -10) a.y = h + 10;
          else if (a.y > h + 10) a.y = -10;

          const dx = a.x - pointer.x;
          const dy = a.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 22000) {
            const f = (22000 - d2) / 22000;
            a.x += dx * f * 0.012;
            a.y += dy * f * 0.012;
          }
        }
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * 0.28;
            ctx.strokeStyle = `rgba(${color}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        const c = n.hue ? accent : color;
        ctx.fillStyle = `rgba(${c}, ${n.hue ? 0.9 : 0.75})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        if (n.hue) {
          ctx.fillStyle = `rgba(${c}, 0.18)`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = () => {
      frame = 0;
      if (!visible || document.hidden) return;
      draw(true);
      frame = window.requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduced || frame) return;
      frame = window.requestAnimationFrame(loop);
    };

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => {
      pointer = { x: -9999, y: -9999 };
    };
    const onVisibility = () => {
      if (!document.hidden) start();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible) start();
      },
      { rootMargin: "10% 0px" }
    );

    resize();
    io.observe(canvas);
    window.addEventListener("resize", resize);
    canvas.parentElement?.addEventListener("pointermove", onPointer, { passive: true });
    canvas.parentElement?.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    if (reduced) draw(false);
    else start();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("resize", resize);
      canvas.parentElement?.removeEventListener("pointermove", onPointer);
      canvas.parentElement?.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced, density, color, accent]);

  return <canvas ref={canvasRef} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
