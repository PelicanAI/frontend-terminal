'use client';

import { useState, useRef } from 'react';
import { ArrowCounterClockwise } from '@phosphor-icons/react';

interface DemoVideoProps {
  demoSrc?: string;
}

export default function DemoVideoPlaceholder({ demoSrc }: DemoVideoProps) {
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleReplay = () => {
    // Increment key to force iframe remount, which restarts the demo
    setKey((k) => k + 1);
  };

  if (!demoSrc) {
    // Fallback placeholder when no demo source provided
    return (
      <div
        style={{
          height: 'clamp(240px, 70vw, 600px)',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            pointerEvents: 'none',
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Demo coming soon
        </span>
      </div>
    );
  }

  return (
    <div className="demo-video">
      <iframe
        key={key}
        ref={iframeRef}
        src={demoSrc}
        className="demo-video-iframe"
        allow="autoplay"
        title="Demo video"
      />

      {/* Replay button */}
      <button
        onClick={handleReplay}
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: 'rgba(255, 255, 255, 0.8)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
          e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
          e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        }}
        title="Replay demo"
      >
        <ArrowCounterClockwise size={16} weight="regular" />
      </button>
    </div>
  );
}
