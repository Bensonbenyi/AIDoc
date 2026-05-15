'use client';

import { useState, useRef, useEffect } from 'react';
import { DocumentBlock } from '@/types/block';
import { Play, Check, X, Loader2 } from 'lucide-react';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function CodeBlock({ block, onUpdate }: Props) {
  const [code, setCode] = useState((block.content.code as string) || '');
  const [output, setOutput] = useState(block.content.output as string | undefined);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>(
    (block.content.status as 'idle' | 'running' | 'success' | 'error') || 'idle'
  );
  const [execTime, setExecTime] = useState(block.content.executionTime as string | undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [code]);

  const runCode = () => {
    setStatus('running');
    setOutput(undefined);
    setExecTime(undefined);

    setTimeout(() => {
      const success = Math.random() > 0.15;
      const nextStatus = success ? 'success' : 'error';
      const nextExecTime = success ? '耗时 0.23s' : '耗时 0.05s';
      const nextOutput = success
        ? '📊 月度增长数据：\n  月份  用户数  收入(万)\n   1月    1200       45\n   2月    1800       68\n   3月    2400       92\n   4月    3100      125\n   5月    4200      168\n   6月    5600      224\n\n📈 用户增长率: 366.7%'
        : "Traceback (most recent call last):\n  File \"<stdin>\", line 5, in <module>\nModuleNotFoundError: No module named 'pandas'\n\n请确认已安装 pandas: pip install pandas";

      if (success) {
        setStatus('success');
      } else {
        setStatus('error');
      }
      setOutput(nextOutput);
      setExecTime(nextExecTime);
      onUpdate({ ...block.content, code, output: nextOutput, status: nextStatus, executionTime: nextExecTime });
    }, 1200 + Math.random() * 800);
  };

  const statusConfig = {
    idle: { dot: 'bg-gray-400', text: '就绪', icon: null },
    running: { dot: 'bg-yellow-400', text: '运行中…', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    success: { dot: 'bg-green-500', text: '运行成功', icon: <Check className="w-3 h-3" /> },
    error: { dot: 'bg-red-500', text: '运行失败', icon: <X className="w-3 h-3" /> },
  };

  const st = statusConfig[status];

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-[#1e1e2e]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#cdd6f4] font-mono">Python</span>
          <span className="flex items-center gap-1 text-xs text-[#a6adc8]">
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {st.icon} {st.text}
          </span>
        </div>
        <button
          onClick={runCode}
          disabled={status === 'running'}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium transition-all ${
            status === 'running'
              ? 'bg-yellow-500/20 text-yellow-400'
              : status === 'success'
              ? 'bg-green-500/20 text-green-400'
              : status === 'error'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
          }`}
        >
          {status === 'running' ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> 运行中</>
          ) : status === 'success' ? (
            <><Check className="w-3 h-3" /> 成功</>
          ) : status === 'error' ? (
            <><X className="w-3 h-3" /> 失败</>
          ) : (
            <><Play className="w-3 h-3" /> 运行</>
          )}
        </button>
      </div>
      <textarea
        ref={textareaRef}
        data-editor-focus-target="true"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        className="w-full bg-transparent text-[#cdd6f4] font-mono text-sm p-3 outline-none resize-none min-h-[80px]"
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const s = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            setCode(code.substring(0, s) + '    ' + code.substring(end));
            setTimeout(() => {
              if (textareaRef.current) textareaRef.current.selectionStart = textareaRef.current.selectionEnd = s + 4;
            }, 0);
          }
        }}
      />
      {(output || status === 'running') && (
        <div className="border-t border-white/5">
          <div className="flex items-center justify-between px-3 py-1 bg-[#11111b]">
            <span className="text-xs text-[#a6adc8]">Output</span>
            {execTime && <span className="text-xs text-[#6c7086]">{execTime}</span>}
          </div>
          <pre
            className={`px-3 py-2 text-xs font-mono whitespace-pre-wrap ${
              status === 'error' ? 'text-[#f38ba8]' : 'text-[#a6e3a1]'
            }`}
          >
            {output || (status === 'running' ? '执行中...' : '')}
          </pre>
        </div>
      )}
    </div>
  );
}
