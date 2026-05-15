'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, MoreVertical, Sparkles, Trash2, Type } from 'lucide-react';
import { BlockType } from '@/types/block';

interface Props {
  label: string;
  onDelete: () => void;
  onDuplicate: () => void;
  onAskAI: () => void;
  blockType?: BlockType;
  onConvert?: (blockType: BlockType) => void;
  onStyleChange?: (style: Record<string, unknown>) => void;
  className?: string;
}

const CONVERTIBLE_TYPES: { type: BlockType; label: string }[] = [
  { type: 'text', label: '正文' },
  { type: 'h1', label: '标题 1' },
  { type: 'h2', label: '标题 2' },
  { type: 'h3', label: '标题 3' },
  { type: 'quote', label: '引用' },
];

const FONT_SIZES = [14, 16, 20, 28];
const FONT_WEIGHTS = [
  { label: '常规', value: 400 },
  { label: '中粗', value: 600 },
  { label: '加粗', value: 700 },
];
const COLORS = ['#111827', '#4f46e5', '#0f766e', '#b45309', '#be123c'];

function isTextLike(type?: BlockType) {
  return type === 'text' || type === 'h1' || type === 'h2' || type === 'h3' || type === 'quote';
}

export function BlockActionMenu({
  label,
  onDelete,
  onDuplicate,
  onAskAI,
  blockType,
  onConvert,
  onStyleChange,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const showTextControls = isTextLike(blockType) && onConvert && onStyleChange;

  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [open]);

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="flex h-6 w-5 items-center justify-center rounded-md text-muted-foreground/55 opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-7 z-50 w-52 rounded-lg border border-border bg-white p-1 text-sm shadow-lg shadow-black/10"
        >
          {showTextControls && (
            <>
              <div className="px-2 pb-1 pt-1 text-[11px] font-medium text-muted-foreground">转换</div>
              <div className="grid grid-cols-2 gap-1 px-1 pb-1">
                {CONVERTIBLE_TYPES.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    role="menuitem"
                    onClick={() => run(() => onConvert(item.type))}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left hover:bg-muted ${
                      blockType === item.type ? 'text-indigo-600' : 'text-foreground/85'
                    }`}
                  >
                    <Type className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-border px-2 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">
                样式
              </div>
              <div className="space-y-1 px-1 pb-1">
                <div className="flex gap-1">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => onStyleChange({ fontSize: size })}
                      className="h-7 rounded-md px-2 text-xs text-foreground/80 hover:bg-muted"
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {FONT_WEIGHTS.map((weight) => (
                    <button
                      key={weight.value}
                      type="button"
                      onClick={() => onStyleChange({ fontWeight: weight.value })}
                      className="h-7 rounded-md px-2 text-xs text-foreground/80 hover:bg-muted"
                    >
                      {weight.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onStyleChange({ color })}
                      className="h-6 w-6 rounded-md border border-border"
                      style={{ backgroundColor: color }}
                      aria-label={`文字颜色 ${color}`}
                      title={`文字颜色 ${color}`}
                    />
                  ))}
                </div>
              </div>
              <div className="my-1 border-t border-border" />
            </>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => run(onDuplicate)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-foreground/85 hover:bg-muted"
          >
            <Copy className="h-3.5 w-3.5" />
            复制
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run(onAskAI)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-foreground/85 hover:bg-muted"
          >
            <Sparkles className="h-3.5 w-3.5" />
            问 AI
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run(onDelete)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </button>
        </div>
      )}
    </div>
  );
}
