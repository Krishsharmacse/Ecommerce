'use client';
import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const particles: HTMLDivElement[] = [];
        const count = 25;

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            const size = Math.random() * 3 + 1;
            p.style.cssText = `
        width:${size}px;height:${size}px;
        left:${Math.random() * 100}%;
        animation-duration:${Math.random() * 20 + 15}s;
        animation-delay:${Math.random() * 10}s;
        opacity:0;
        background:${Math.random() > 0.5 ? '#a78bfa' : '#67e8f9'};
      `;
            container.appendChild(p);
            particles.push(p);
        }
        return () => { particles.forEach(p => p.remove()); };
    }, []);

    return (
        <>
            <div className="animated-bg" />
            <div className="bg-grid" />
            <div className="particles" ref={containerRef} />
        </>
    );
}
