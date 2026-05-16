'use client';

import { useState, useCallback } from 'react';
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

const MIN_EDITOR_HEIGHT = 120;
const MAX_EDITOR_HEIGHT = 320;

type CodeStatus = 'idle' | 'running' | 'success' | 'error';

interface CodeBlockState {
  sourceContent: Record<string, unknown>;
  code: string;
  output?: string;
  stderr?: string;
  status: CodeStatus;
  execTime?: string;
}

function getCodeBlockState(content: Record<string, unknown>): CodeBlockState {
  return {
    sourceContent: content,
    code: (content.code as string) || '',
    output: content.output as string | undefined,
    stderr: content.stderr as string | undefined,
    status: (content.status as CodeStatus) || 'idle',
    execTime: content.executionTime as string | undefined,
  };
}

export function CodeBlock({ block, onUpdate }: Props) {
  const [state, setState] = useState(() => getCodeBlockState(block.content));
  const [editorHeight, setEditorHeight] = useState(MIN_EDITOR_HEIGHT);

  if (state.sourceContent !== block.content) {
    setState(getCodeBlockState(block.content));
  }

  const { code, output, stderr, status, execTime } = state;

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

    setState((current) => ({
      ...current,
      output: undefined,
      stderr: undefined,
      status: 'running',
      execTime: undefined,
    }));

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

      setState((current) => ({
        ...current,
        output: result.stdout || undefined,
        stderr: result.stderr || undefined,
        status: resultStatus,
        execTime: timeStr,
      }));

      onUpdate({
        ...block.content,
        code,
        output: result.stdout || '',
        stderr: result.stderr || '',
        status: resultStatus,
        executionTime: timeStr || '',
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '执行请求失败';
      setState((current) => ({
        ...current,
        output: undefined,
        stderr: errorMsg,
        status: 'error',
        execTime: undefined,
      }));
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
      setState((current) => ({
        ...current,
        code: newCode,
        status: 'idle',
        output: undefined,
        stderr: undefined,
        execTime: undefined,
      }));
      // 同步更新 block content（不触发执行状态保存）
      onUpdate({ ...block.content, code: newCode, status: 'idle', output: '', stderr: '', executionTime: '' });
    },
    [block.content, onUpdate]
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
    if (status === 'running') return 'bg-yellow-100 text-yellow-700';
    if (status === 'success') return 'bg-green-100 text-green-700 hover:bg-green-200';
    if (status === 'error') return 'bg-red-100 text-red-700 hover:bg-red-200';
    return 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200';
  };

  return (
    <div
      className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm"
      onClick={(e) => e.stopPropagation()}
      onKeyDownCapture={(e) => {
        // 让 Monaco Editor 自己处理所有键盘事件，阻止父级 SortableBlock 拦截
        e.stopPropagation();
      }}
    >
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-700 font-mono">Python</span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {st.icon} {st.text}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={askAI}
            disabled={!code.trim()}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-40 disabled:cursor-not-allowed"
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
      <div className="min-h-[120px] max-h-[320px] overflow-hidden">
        <MonacoEditor
          height={editorHeight}
          language="python"
          theme="light"
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
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 8,
            },
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
          }}
          onMount={(editor) => {
            // 自动调整高度：监听内容变化
            const updateHeight = () => {
              const contentHeight = editor.getContentHeight() + 16;
              setEditorHeight(Math.min(MAX_EDITOR_HEIGHT, Math.max(MIN_EDITOR_HEIGHT, contentHeight)));
              editor.layout();
            };
            editor.onDidContentSizeChange(updateHeight);
            updateHeight();
          }}
        />
      </div>

      {/* 输出面板 */}
      {(output || stderr || status === 'running' || status === 'success' || status === 'error') && (
        <div className="border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between px-3 py-1 bg-slate-100">
            <span className="text-xs text-slate-500">Output</span>
            {execTime && <span className="text-xs text-slate-400">{execTime}</span>}
          </div>
          <div className="px-3 py-2 text-xs font-mono max-h-[200px] overflow-auto">
            {output && (
              <pre className="m-0 whitespace-pre-wrap break-words leading-relaxed text-green-700">{output}</pre>
            )}
            {stderr && (
              <pre className="m-0 whitespace-pre-wrap break-words leading-relaxed text-red-700">{stderr}</pre>
            )}
            {status === 'running' && !output && !stderr && (
              <span className="text-slate-500">执行中...</span>
            )}
            {status === 'success' && !output && !stderr && (
              <span className="text-green-700">执行成功（无输出）</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
