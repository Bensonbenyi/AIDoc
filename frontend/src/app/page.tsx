'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { documentsAPI } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'redirect' | 'empty' | 'error'>('loading');

  useEffect(() => {
    documentsAPI.getTree()
      .then((tree) => {
        // 找到第一个文档并跳转
        const firstDoc = findFirstDoc(tree);
        if (firstDoc) {
          setStatus('redirect');
          router.replace(`/documents/${firstDoc}`, { scroll: false });
        } else {
          setStatus('empty');
        }
      })
      .catch(() => {
        setStatus('error');
      });
  }, [router]);

  if (status === 'loading' || status === 'redirect') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">无法连接到后端服务</p>
        <p className="text-sm text-muted-foreground/60">请确保后端服务已启动 (http://localhost:8000)</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded-md bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  // status === 'empty'
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <p className="text-lg text-foreground">欢迎使用 AIDoc</p>
      <p className="text-sm text-muted-foreground">后端暂无文档数据</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 rounded-md bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600 transition-colors"
      >
        刷新
      </button>
    </div>
  );
}

function findFirstDoc(tree: { id: string; children?: unknown[] }[]): string | null {
  for (const node of tree) {
    return String(node.id);
  }
  return null;
}
