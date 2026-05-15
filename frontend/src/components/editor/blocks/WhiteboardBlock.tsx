'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { DocumentBlock } from '@/types/block';
import { Pen, Eraser, Undo2, Redo2, Maximize2 } from 'lucide-react';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Path {
  tool: 'pen' | 'eraser';
  points: Point[];
}

export function WhiteboardBlock({ block, onUpdate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [paths, setPaths] = useState<Path[]>((block.content.paths as Path[]) || []);
  const [redoStack, setRedoStack] = useState<Path[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paths.forEach((p) => {
      if (p.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) {
        ctx.lineTo(p.points[i].x, p.points[i].y);
      }
      ctx.strokeStyle = p.tool === 'eraser' ? '#fefefe' : '#333';
      ctx.lineWidth = p.tool === 'eraser' ? 20 : 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });
  }, [paths]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      draw();
    }
  }, [expanded, draw]);

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const startDraw = (e: React.MouseEvent) => {
    setDrawing(true);
    const pos = getPos(e);
    setPaths((p) => [...p, { tool, points: [pos] }]);
    setRedoStack([]);
  };

  const moveDraw = (e: React.MouseEvent) => {
    if (!drawing) return;
    const pos = getPos(e);
    setPaths((p) => {
      const last = p[p.length - 1];
      if (!last) return p;
      return [...p.slice(0, -1), { ...last, points: [...last.points, pos] }];
    });
  };

  const endDraw = () => {
    setDrawing(false);
    onUpdate({ ...block.content, paths });
  };

  const undo = () => {
    setPaths((p) => {
      if (p.length === 0) return p;
      setRedoStack((r) => [...r, p[p.length - 1]]);
      return p.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const last = r[r.length - 1];
      setPaths((p) => [...p, last]);
      return r.slice(0, -1);
    });
  };

  const content = (
    <div className="rounded-lg border border-border overflow-hidden bg-white">
      <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border-b border-border">
        <span className="text-sm mr-2">🎨</span>
        <span className="text-xs font-medium text-foreground/70 mr-auto">交互式白板</span>
        <button
          onClick={() => setTool('pen')}
          className={`p-1 rounded text-xs ${tool === 'pen' ? 'bg-indigo-100 text-indigo-600' : 'text-muted-foreground hover:bg-muted'}`}
        >
          <Pen className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`p-1 rounded text-xs ${tool === 'eraser' ? 'bg-indigo-100 text-indigo-600' : 'text-muted-foreground hover:bg-muted'}`}
        >
          <Eraser className="w-3.5 h-3.5" />
        </button>
        <button onClick={undo} className="p-1 rounded text-xs text-muted-foreground hover:bg-muted">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="p-1 rounded text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="p-1 rounded text-xs text-muted-foreground hover:bg-muted ml-1"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className={`relative ${expanded ? 'h-[400px]' : 'h-[200px]'}`}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
        />
      </div>
    </div>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-8" onClick={() => setExpanded(false)}>
        <div className="w-full max-w-4xl h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-border">
            <span className="text-sm mr-2">🎨</span>
            <span className="text-sm font-medium text-foreground/70 mr-auto">交互式白板</span>
            <button onClick={() => setTool('pen')} className={`p-1.5 rounded ${tool === 'pen' ? 'bg-indigo-100 text-indigo-600' : 'text-muted-foreground hover:bg-muted'}`}>
              <Pen className="w-4 h-4" />
            </button>
            <button onClick={() => setTool('eraser')} className={`p-1.5 rounded ${tool === 'eraser' ? 'bg-indigo-100 text-indigo-600' : 'text-muted-foreground hover:bg-muted'}`}>
              <Eraser className="w-4 h-4" />
            </button>
            <button onClick={undo} className="p-1.5 rounded text-muted-foreground hover:bg-muted"><Undo2 className="w-4 h-4" /></button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded text-muted-foreground hover:bg-muted disabled:opacity-40"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button onClick={() => setExpanded(false)} className="ml-2 px-3 py-1 text-xs border border-border rounded bg-background hover:bg-muted">
              收起 ✕
            </button>
          </div>
          <div className="relative h-[calc(100%-48px)]">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 cursor-crosshair"
              onMouseDown={startDraw}
              onMouseMove={moveDraw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
            />
          </div>
        </div>
      </div>
    );
  }

  return content;
}
