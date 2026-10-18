'use client';

import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'motion/react';
import type { KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

export type HoverExpandOrientation = 'horizontal' | 'vertical';

export interface HoverExpandItem {
  alt?: string;
  description?: string;
  id: string;
  image?: string;
  title: string;
}

export interface HoverExpandProps {
  activeIndex?: number;
  className?: string;
  collapsedFlex?: number;
  expandedFlex?: number;
  items: HoverExpandItem[];
  onActiveIndexChange?: (index: number) => void;
  onImageError?: (id: string) => void;
  orientation?: HoverExpandOrientation;
  showLabelsWhenCollapsed?: boolean;
}

const HoverExpand = ({
  items,
  orientation = 'horizontal',
  activeIndex: activeIndexProp,
  onActiveIndexChange,
  onImageError,
  expandedFlex = 4,
  collapsedFlex = 1,
  showLabelsWhenCollapsed = true,
  className,
}: HoverExpandProps) => {
  const shouldReduceMotion = useReducedMotion();
  const [internalActive, setInternalActive] = useState(0);
  const isControlled = activeIndexProp !== undefined;
  const activeIndex = isControlled ? activeIndexProp : internalActive;
  const [isHoverDevice, setIsHoverDevice] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const panelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isHorizontal = orientation === 'horizontal' && !isCompact;

  useEffect(() => {
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const compactQuery = window.matchMedia('(max-width: 767px)');
    const updateMedia = () => {
      setIsHoverDevice(hoverQuery.matches);
      setIsCompact(compactQuery.matches);
    };

    updateMedia();
    hoverQuery.addEventListener('change', updateMedia);
    compactQuery.addEventListener('change', updateMedia);
    return () => {
      hoverQuery.removeEventListener('change', updateMedia);
      compactQuery.removeEventListener('change', updateMedia);
    };
  }, []);

  const setActive = (index: number) => {
    if (!isControlled) setInternalActive(index);
    onActiveIndexChange?.(index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

    if (event.key === nextKey) {
      event.preventDefault();
      const next = Math.min(index + 1, items.length - 1);
      setActive(next);
      panelRefs.current[next]?.focus();
    } else if (event.key === prevKey) {
      event.preventDefault();
      const prev = Math.max(index - 1, 0);
      setActive(prev);
      panelRefs.current[prev]?.focus();
    }
  };

  return (
    <div
      aria-label="Pratinjau foto galeri"
      className={cn(
        'mx-auto flex w-full max-w-5xl gap-2',
        orientation === 'horizontal'
          ? 'h-[320px] flex-col sm:h-[360px] md:h-[420px] md:flex-row'
          : 'h-[520px] flex-col',
        className,
      )}
      role="group"
    >
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        const shouldShowLabel = isActive || showLabelsWhenCollapsed;

        return (
          <motion.button
            animate={{ flexGrow: isActive ? expandedFlex : collapsedFlex }}
            aria-label={item.title}
            aria-pressed={isActive}
            className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-300 bg-slate-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
            initial={false}
            key={item.id}
            onClick={() => {
              if (!isHoverDevice) setActive(index);
            }}
            onFocus={() => setActive(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onMouseEnter={() => {
              if (isHoverDevice) setActive(index);
            }}
            ref={(element) => {
              panelRefs.current[index] = element;
            }}
            style={{ flexBasis: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { bounce: 0.1, duration: 0.25, type: 'spring' }
            }
            type="button"
          >
            {item.image ? (
              <img
                alt={item.alt ?? item.title}
                className="absolute inset-0 h-full w-full select-none object-cover"
                data-protected-img=""
                draggable={false}
                loading="lazy"
                src={item.image}
                onError={() => onImageError?.(item.id)}
              />
            ) : null}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent"
            />
            <motion.div
              animate={
                shouldReduceMotion
                  ? { opacity: shouldShowLabel ? 1 : 0 }
                  : {
                      opacity: shouldShowLabel ? 1 : 0,
                      rotate: isHorizontal && !isActive ? -90 : 0,
                    }
              }
              className="pointer-events-none absolute inset-0 flex items-end p-3 sm:p-4"
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { bounce: 0.1, duration: 0.25, type: 'spring' }
              }
            >
              <div className={cn(isHorizontal && !isActive && 'origin-left whitespace-nowrap')}>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                {isActive && item.description ? (
                  <p className="mt-1 text-xs text-white/80">{item.description}</p>
                ) : null}
              </div>
            </motion.div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default HoverExpand;