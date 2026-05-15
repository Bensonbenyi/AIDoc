'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DocumentBlock } from '@/types/block';
import {
  Maximize2,
  Minimize2,
  Loader2,
  Check,
  GripHorizontal,
  Pen,
  Eraser,
  Undo2,
  Redo2,
} from 'lucide-react';
import { put, get } from '@/lib/api';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
  blockId: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type Tool = 'pen' | 'eraser';

interface PathData {
  tool: Tool;
  pts: { x: number; y: number }[];
}

// 白板数据接口
interface WhiteboardData {
  id: string;
  blockId: string;
  documentId: string;
  dataJson: unknown;
  previewImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

function drawPaths(ctx: CanvasRenderingContext2D, paths: PathData[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  paths.forEach((p) => {
    if (p.pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(p.pts[0].x, p.pts[0].y);
    for (let i = 1; i < p.pts.length; i++) {
      ctx.lineTo(p.pts[i].x, p.pts[i].y);
    }
    ctx.strokeStyle = p.tool === 'eraser' ? '#fefefe' : '#333';
    ctx.lineWidth = p.tool === 'eraser' ? 20 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  });
}

export function WhiteboardBlock({ block, onUpdate, blockId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [tool, setTool] = useState<Tool>('pen');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // 拖拽调整大小
  const [height, setHeight] = useState(300);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Canvas 状态
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathsRef = useRef<PathData[]>([]);
  const redoRef = useRef<PathData[]>([]);
  const drawingRef = useRef(false);
  const [, forceRender] = useState(0);

  // 展开模式的 canvas 状态
  const expCanvasWrapRef = useRef<HTMLDivElement>(null);
  const expCanvasRef = useRef<HTMLCanvasElement>(null);

  // 初始化 canvas 尺寸
  const initCanvas = useCallback(
    (canvas: HTMLCanvasElement, wrap: HTMLDivElement) => {
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawPaths(ctx, pathsRef.current);
      }
    },
    []
  );

  // 从后端加载白板数据
  const loadWhiteboardData = useCallback(async () => {
    try {
      const data = await get<WhiteboardData>(
        `/api/blocks/${blockId}/whiteboard`
      );
      return data.dataJson as PathData[] | null;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('404')) {
        console.error('加载白板数据失败:', error);
      }
    }
    return null;
  }, [blockId]);

  // 保存白板数据到后端
  const saveWhiteboardData = useCallback(
    async (paths: PathData[]) => {
      if (isLoadingRef.current) return;
      setSaveStatus('saving');
      try {
        await put(`/api/blocks/${blockId}/whiteboard`, {
          dataJson: paths,
        });
        setSaveStatus('saved');
        onUpdate({ ...block.content, whiteboardSnapshot: paths });
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        console.error('保存白板数据失败:', error);
        setSaveStatus('error');
      }
    },
    [blockId, block.content, onUpdate]
  );

  // Debounce 保存
  const debouncedSave = useCallback(
    (paths: PathData[]) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveWhiteboardData(paths);
      }, 3000);
    },
    [saveWhiteboardData]
  );

  // Canvas 事件处理
  const getPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget;
      const pos = getPos(e, canvas);
      drawingRef.current = true;
      pathsRef.current.push({ tool, pts: [pos] });
      redoRef.current = [];
    },
    [tool, getPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const canvas = e.currentTarget;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pos = getPos(e, canvas);
      pathsRef.current[pathsRef.current.length - 1].pts.push(pos);
      drawPaths(ctx, pathsRef.current);
    },
    [getPos]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    debouncedSave(pathsRef.current);
    forceRender((n) => n + 1);
  }, [debouncedSave]);

  const handleUndo = useCallback(() => {
    if (pathsRef.current.length === 0) return;
    redoRef.current.push(pathsRef.current.pop()!);
    const canvas = expanded
      ? expCanvasRef.current
      : canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawPaths(ctx, pathsRef.current);
    }
    debouncedSave(pathsRef.current);
    forceRender((n) => n + 1);
  }, [expanded, debouncedSave]);

  const handleRedo = useCallback(() => {
    if (redoRef.current.length === 0) return;
    pathsRef.current.push(redoRef.current.pop()!);
    const canvas = expanded
      ? expCanvasRef.current
      : canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawPaths(ctx, pathsRef.current);
    }
    debouncedSave(pathsRef.current);
    forceRender((n) => n + 1);
  }, [expanded, debouncedSave]);

  // 加载数据并初始化 canvas
  useEffect(() => {
    const loadData = async () => {
      isLoadingRef.current = true;
      const saved = await loadWhiteboardData();
      if (saved && Array.isArray(saved)) {
        pathsRef.current = saved as PathData[];
      }
      isLoadingRef.current = false;

      // 初始化内联 canvas
      if (canvasRef.current && canvasWrapRef.current) {
        initCanvas(canvasRef.current, canvasWrapRef.current);
      }
    };
    loadData();
  }, [loadWhiteboardData, initCanvas]);

  // 展开模式下初始化 canvas
  useEffect(() => {
    if (expanded && expCanvasRef.current && expCanvasWrapRef.current) {
      // 延迟一帧确保 DOM 已渲染
      requestAnimationFrame(() => {
        if (expCanvasRef.current && expCanvasWrapRef.current) {
          initCanvas(expCanvasRef.current, expCanvasWrapRef.current);
        }
      });
    }
  }, [expanded, initCanvas]);

  // 窗口 resize 时重新初始化
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasWrapRef.current) {
        initCanvas(canvasRef.current, canvasWrapRef.current);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // 拖拽调整大小
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      startYRef.current = e.clientY;
      startHeightRef.current = height;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    },
    [height]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientY - startYRef.current;
      setHeight(Math.max(200, Math.min(800, startHeightRef.current + delta)));
    };
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const saveStatusIcon = {
    idle: null,
    saving: <Loader2 className="w-3 h-3 animate-spin text-gray-400" />,
    saved: <Check className="w-3 h-3 text-green-500" />,
    error: <span className="text-xs text-red-500">保存失败</span>,
  };

  const ToolBar = () => (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => setTool('pen')}
        className={`p-1 rounded text-xs ${
          tool === 'pen'
            ? 'bg-indigo-100 text-indigo-600'
            : 'text-muted-foreground hover:bg-muted'
        }`}
        title="画笔"
      >
        <Pen className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setTool('eraser')}
        className={`p-1 rounded text-xs ${
          tool === 'eraser'
            ? 'bg-indigo-100 text-indigo-600'
            : 'text-muted-foreground hover:bg-muted'
        }`}
        title="橡皮"
      >
        <Eraser className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleUndo}
        className="p-1 rounded text-xs text-muted-foreground hover:bg-muted"
        title="撤销"
      >
        <Undo2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleRedo}
        className="p-1 rounded text-xs text-muted-foreground hover:bg-muted"
        title="重做"
      >
        <Redo2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const inlineContent = (
    <div className="rounded-lg border border-border overflow-hidden bg-white group">
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 border-b border-border">
        <span className="text-xs">🎨</span>
        <span className="text-xs font-medium text-foreground/70 mr-auto">
          白板
        </span>
        <ToolBar />
        {saveStatusIcon[saveStatus]}
        <button
          onClick={() => setExpanded(true)}
          className="p-0.5 rounded text-xs text-muted-foreground hover:bg-muted ml-1"
          title="展开"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
      <div
        ref={canvasWrapRef}
        className="relative cursor-crosshair"
        style={{
          height: `${height}px`,
          background:
            '#fefefe',
          backgroundImage:
            'radial-gradient(circle, #e5e5e5 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
      <div
        className="h-2 bg-gray-50 border-t border-border cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={handleDragStart}
      >
        <GripHorizontal className="w-3 h-3 text-gray-400" />
      </div>
    </div>
  );

  if (expanded) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={() => setExpanded(false)}
      >
        <div
          className="w-full max-w-5xl h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-border">
            <span className="text-xs">🎨</span>
            <span className="text-xs font-medium text-foreground/70 mr-auto">
              交互式白板
            </span>
            <ToolBar />
            {saveStatusIcon[saveStatus]}
            <button
              onClick={() => setExpanded(false)}
              className="ml-2 px-2 py-0.5 text-xs border border-border rounded bg-background hover:bg-muted"
            >
              <Minimize2 className="w-3 h-3 inline mr-1" />
              收起
            </button>
          </div>
          <div
            ref={expCanvasWrapRef}
            className="flex-1 cursor-crosshair"
            style={{
              background:
                '#fefefe',
              backgroundImage:
                'radial-gradient(circle, #e5e5e5 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <canvas
              ref={expCanvasRef}
              className="block w-full h-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>
      </div>
    );
  }

  return inlineContent;
}
