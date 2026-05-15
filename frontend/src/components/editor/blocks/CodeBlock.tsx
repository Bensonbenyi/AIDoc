'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { DocumentBlock } from '@/types/block';
import { Play, Check, X, Loader2, RotateCw, Sparkles } from 'lucide-react';
import { codeExecutionAPI } from '@/lib/api';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useAppStore } from '@/stores/appStore';

// Monaco Editor 使用 dynamic import 避免 SSR 问题
const MonacoEditor = dynamic(
  () => import(/* webpackChunkName: "monaco-editor" */ '@monaco-editor/react'),
  { ssr: false }
);

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function CodeBlock({ block, onUpdate }: Props) {
  const [code, setCode] = useState((block.content.code as string) || '');
  const [output, setOutput] = useState(block.content.output as string | undefined);
  const [stderr, setStderr] = useState(block.content.stderr as string | undefined);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>(
    (block.content.status as 'idle' | 'running' | 'success' | 'error') || 'idle'
  );
  const [execTime, setExecTime] = useState(block.content.executionTime as string | undefined);

  // 当 block.content 从外部更新时同步本地状态
  useEffect(() => {
    setCode((block.content.code as string) || '');
    setOutput(block.content.output as string | undefined);
    setStderr(block.content.stderr as string | undefined);
    setStatus((block.content.status as 'idle' | 'running' | 'success' | 'error') || 'idle');
    setExecTime(block.content.executionTime as string | undefined);
  }, [block.content]);

  const askAI = useCallback(() => {
    const addPendingAttachment = useAIChatStore.getState().addPendingAttachment;
    const askAIWithQuestion = useAIChatStore.getState().askAIWithQuestion;
    const rightSidebarCollapsed = useAppStore.getState().rightSidebarCollapsed;
    const toggleRightSidebar = useAppStore.getState().toggleRightSidebar;

    const attachment = {
      id: `block-${block.id}`,
      kind: 'block' as const,
      title: '代码块',
      icon: '⌘',
      preview: code.slice(0, 100),
      docId: block.documentId,
      blockId: block.id,
      blockType: block.blockType,
    };

    if (code.trim()) {
      askAIWithQuestion('请解释这段代码的功能和逻辑', attachment);
    } else {
      addPendingAttachment(attachment);
    }

    if (rightSidebarCollapsed) toggleRightSidebar();
  }, [block.id, block.documentId, block.blockType, code]);

  const runCode = useCallback(async () => {
    if (!code.trim()) return;

    setStatus('running');
    setOutput(undefined);
    setStderr(undefined);
    setExecTime(undefined);

    try {
      const result = await codeExecutionAPI.execute({
        blockId: block.id,
        documentId: block.documentId,
        language: 'python',
        sourceCode: code,
      });

      const timeStr = result.executionTimeMs
        ? `${(result.executionTimeMs / 1000).toFixed(2)}s`
        : undefined;

      const resultStatus = result.status === 'timeout' ? 'error' : result.status as 'success' | 'error';

      setStatus(resultStatus);
      setOutput(result.stdout || undefined);
      setStderr(result.stderr || undefined);
      setExecTime(timeStr);

      onUpdate({
        ...block.content,
        code,
        output: result.stdout || '',
        stderr: result.stderr || '',
        status: resultStatus,
        executionTime: timeStr || '',
      });
    } catch (err) {
      setStatus('error');
      const errorMsg = err instanceof Error ? err.message : '执行请求失败';
      setStderr(errorMsg);
      onUpdate({
        ...block.content,
        code,
        output: '',
        stderr: errorMsg,
        status: 'error',
        executionTime: '',
      });
    }
  }, [code, block.content, block.id, block.documentId, onUpdate]);

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value ?? '';
      setCode(newCode);
      // 代码变更时重置执行状态
      if (status !== 'idle') {
        setStatus('idle');
        setOutput(undefined);
        setStderr(undefined);
        setExecTime(undefined);
      }
      // 同步更新 block content（不触发执行状态保存）
      onUpdate({ ...block.content, code: newCode, status: 'idle', output: '', stderr: '', executionTime: '' });
    },
    [block.content, onUpdate, status]
  );

  const statusConfig = {
    idle: { dot: 'bg-gray-400', text: '就绪', icon: null },
    running: { dot: 'bg-yellow-400', text: '运行中…', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    success: { dot: 'bg-green-500', text: '运行成功', icon: <Check className="w-3 h-3" /> },
    error: { dot: 'bg-red-500', text: '运行失败', icon: <X className="w-3 h-3" /> },
  };

  const st = statusConfig[status];

  // 按钮文字和样式
  const getButtonContent = () => {
    if (status === 'running') return <><Loader2 className="w-3 h-3 animate-spin" /> 运行中</>;
    if (status === 'success') return <><Check className="w-3 h-3" /> 成功</>;
    if (status === 'error') return <><RotateCw className="w-3 h-3" /> 重试</>;
    return <><Play className="w-3 h-3" /> 运行</>;
  };

  const getButtonClass = () => {
    if (status === 'running') return 'bg-yellow-500/20 text-yellow-400';
    if (status === 'success') return 'bg-green-500/20 text-green-400 hover:bg-green-500/30';
    if (status === 'error') return 'bg-red-500/20 text-red-400 hover:bg-red-500/30';
    return 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30';
  };

  return (
    <div
      className="rounded-lg border border-border overflow-hidden bg-[#1e1e2e]"
      onClick={(e) => e.stopPropagation()}
      onKeyDownCapture={(e) => {
        // 让 Monaco Editor 自己处理所有键盘事件，阻止父级 SortableBlock 拦截
        e.stopPropagation();
      }}
    >
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#cdd6f4] font-mono">Python</span>
          <span className="flex items-center gap-1 text-xs text-[#a6adc8]">
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {st.icon} {st.text}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={askAI}
            disabled={!code.trim()}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
            title="AI 解释代码"
          >
            <Sparkles className="w-3 h-3" />
            AI 解释
          </button>
          <button
            onClick={runCode}
            disabled={status === 'running' || !code.trim()}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium transition-all ${getButtonClass()}`}
          >
            {getButtonContent()}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="min-h-[120px]">
        <MonacoEditor
          height="120px"
          language="python"
          theme="vs-dark"
          value={code}
          onChange={handleCodeChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 4,
            insertSpaces: true,
            automaticLayout: true,
            padding: { top: 8, bottom: 8 },
            renderLineHighlight: 'none',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: 'hidden',
              horizontal: 'auto',
              verticalScrollbarSize: 0,
            },
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
          }}
          onMount={(editor) => {
            // 自动调整高度：监听内容变化
            const updateHeight = () => {
              const contentHeight = Math.max(120, editor.getContentHeight() + 16);
              const domNode = editor.getDomNode();
              if (domNode) {
                domNode.style.height = `${contentHeight}px`;
              }
              editor.layout();
            };
            editor.onDidContentSizeChange(updateHeight);
            updateHeight();
          }}
        />
      </div>

      {/* 输出面板 */}
      {(output || stderr || status === 'running') && (
        <div className="border-t border-white/5">
          <div className="flex items-center justify-between px-3 py-1 bg-[#11111b]">
            <span className="text-xs text-[#a6adc8]">Output</span>
            {execTime && <span className="text-xs text-[#6c7086]">{execTime}</span>}
          </div>
          <div className="px-3 py-2 text-xs font-mono whitespace-pre-wrap max-h-[200px] overflow-auto">
            {output && (
              <pre className="text-[#a6e3a1]">{output}</pre>
            )}
            {stderr && (
              <pre className="text-[#f38ba8]">{stderr}</pre>
            )}
            {status === 'running' && !output && !stderr && (
              <span className="text-[#a6adc8]">执行中...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
