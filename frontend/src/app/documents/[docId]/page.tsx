'use client';

import { use, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAppStore } from '@/stores/appStore';

export default function DocumentPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = use(params);
  const setActiveDocId = useAppStore((s) => s.setActiveDocId);

  // 同步 URL 中的 docId 到 store
  // loadDocument 由 DocumentEditor 组件根据 activeDocId 变化自动触发
  useEffect(() => {
    setActiveDocId(docId);
  }, [docId, setActiveDocId]);

  return <AppLayout />;
}
