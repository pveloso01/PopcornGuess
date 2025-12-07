'use client';

/**
 * Animation Components
 *
 * Reusable animation components for micro-interactions:
 * - FadeIn: Fade in animation
 * - SlideUp: Slide up with fade
 * - ScaleIn: Scale from center
 * - Shake: Error shake effect
 * - Pulse: Attention pulse
 */

import React from 'react';

interface AnimationProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

/**
 * Fade In Animation
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 300,
  className = '',
}: AnimationProps) {
  return (
    <div
      className={`animate-fade-in ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Slide Up Animation
 */
export function SlideUp({
  children,
  delay = 0,
  duration = 300,
  className = '',
}: AnimationProps) {
  return (
    <div
      className={`animate-fade-up ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Scale In Animation
 */
export function ScaleIn({
  children,
  delay = 0,
  duration = 300,
  className = '',
}: AnimationProps) {
  return (
    <div
      className={`animate-scale-in ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Bounce In Animation
 */
export function BounceIn({
  children,
  delay = 0,
  duration = 500,
  className = '',
}: AnimationProps) {
  return (
    <div
      className={`animate-bounce-in ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Shake Animation (for errors)
 */
export function Shake({
  children,
  className = '',
  shake = false,
}: {
  children: React.ReactNode;
  className?: string;
  shake?: boolean;
}) {
  return (
    <div className={`${shake ? 'animate-shake' : ''} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Stagger Children - animate children with staggered delays
 */
export function Stagger({
  children,
  staggerDelay = 100,
  initialDelay = 0,
  animation = 'fade-up',
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
  animation?: 'fade-in' | 'fade-up' | 'scale-in';
}) {
  const animationClass = {
    'fade-in': 'animate-fade-in',
    'fade-up': 'animate-fade-up',
    'scale-in': 'animate-scale-in',
  };

  return (
    <>
      {React.Children.map(children, (child, index) => (
        <div
          className={animationClass[animation]}
          style={{
            animationDelay: `${initialDelay + index * staggerDelay}ms`,
            animationFillMode: 'backwards',
          }}
        >
          {child}
        </div>
      ))}
    </>
  );
}

/**
 * Pulse Glow - for highlighting important elements
 */
export function PulseGlow({
  children,
  active = true,
  className = '',
}: {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <div className={`${active ? 'animate-pulse-glow' : ''} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Float - gentle floating animation
 */
export function Float({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`animate-float ${className}`}>{children}</div>;
}

/**
 * Spin - spinning animation
 */
export function Spin({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`animate-spin ${className}`}>{children}</div>;
}

