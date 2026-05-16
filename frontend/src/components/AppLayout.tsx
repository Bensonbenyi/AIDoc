'use client';

import { useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useDocumentStore } from '@/stores/documentStore';
import { DocumentTree } from '@/components/sidebar/DocumentTree';
import { AIAssistantPanel } from '@/components/sidebar/AIAssistantPanel';
import { DocumentEditor } from '@/components/editor/DocumentEditor';
import { SlashCommandMenu } from '@/components/editor/SlashCommandMenu';
import { AppDndProvider } from '@/components/dnd/AppDndProvider';
import {
  PanelLeftOpen,
  PanelRightOpen,
} from 'lucide-react';
import { findDocPath } from '@/stores/documentStore';

function EditorDropZone() {
  return (
    <div className="h-full">
      <EditorContent />
    </div>
  );
}

function EditorContent() {
  const activeDocId = useAppStore((s) => s.activeDocId);
  const tree = useDocumentStore((s) => s.tree);
  const path = findDocPath(tree, activeDocId) || [];

  return (
    <div className="h-full overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>默认文档空间</span>
            {path.map((p, i) => (
              <span key={i} className="flex items-center gap-1">
                <span>/</span>
                <span className={i === path.length - 1 ? 'text-foreground font-medium' : ''}>{p}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <DocumentEditor />
    </div>
  );
}

function ResizableLeftSidebar() {
  const { leftSidebarCollapsed, leftSidebarWidth, setLeftSidebarWidth } = useAppStore();
  const sidebarRef = useRef<HTMLElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = leftSidebarWidth;

      const onMouseMove = (e: MouseEvent) => {
        const dx = e.clientX - startX;
        const newWidth = Math.max(200, Math.min(400, startWidth + dx));
        setLeftSidebarWidth(newWidth);
      };

      const onMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [leftSidebarWidth, setLeftSidebarWidth]
  );

  return (
    <aside
      ref={sidebarRef}
      className={`relative shrink-0 overflow-hidden border-r border-border bg-[#fbfaf9] ${
        isResizing ? 'select-none' : 'transition-[width] duration-300 ease-out'
      }`}
      style={{ width: leftSidebarCollapsed ? 0 : leftSidebarWidth }}
      aria-hidden={leftSidebarCollapsed}
    >
      <div
        className={`flex h-full flex-col transition-opacity duration-200 ${
          leftSidebarCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        style={{ width: leftSidebarWidth }}
      >
        <DocumentTree />
      </div>
      {/* Resize handle */}
      {!leftSidebarCollapsed && (
        <div
          className="absolute right-0 top-0 bottom-0 z-10 w-1 cursor-col-resize transition-colors hover:bg-indigo-300/50"
          onMouseDown={startResize}
        />
      )}
    </aside>
  );
}

function ResizableRightSidebar() {
  const { rightSidebarCollapsed, rightSidebarWidth, setRightSidebarWidth } = useAppStore();
  const [isResizing, setIsResizing] = useState(false);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = rightSidebarWidth;

      const onMouseMove = (e: MouseEvent) => {
        const dx = startX - e.clientX;
        const newWidth = Math.max(280, Math.min(500, startWidth + dx));
        setRightSidebarWidth(newWidth);
      };

      const onMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [rightSidebarWidth, setRightSidebarWidth]
  );

  return (
    <aside
      className={`relative shrink-0 overflow-hidden border-l border-border bg-white ${
        isResizing ? 'select-none' : 'transition-[width] duration-300 ease-out'
      }`}
      style={{ width: rightSidebarCollapsed ? 0 : rightSidebarWidth }}
      aria-hidden={rightSidebarCollapsed}
    >
      {/* Resize handle */}
      {!rightSidebarCollapsed && (
        <div
          className="absolute left-0 top-0 bottom-0 z-10 w-1 cursor-col-resize transition-colors hover:bg-indigo-300/50"
          onMouseDown={startResize}
        />
      )}
      <div
        className={`flex h-full flex-col transition-opacity duration-200 ${
          rightSidebarCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        style={{ width: rightSidebarWidth }}
      >
        <AIAssistantPanel />
      </div>
    </aside>
  );
}

function CollapsedSidebarToggles() {
  const {
    leftSidebarCollapsed,
    rightSidebarCollapsed,
    toggleLeftSidebar,
    toggleRightSidebar,
  } = useAppStore();

  return (
    <>
      {leftSidebarCollapsed && (
        <button
          type="button"
          onClick={toggleLeftSidebar}
          className="fixed left-2 top-3 z-30 rounded-md border border-border bg-white p-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          title="展开文档空间"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}
      {rightSidebarCollapsed && (
        <button
          type="button"
          onClick={toggleRightSidebar}
          className="fixed right-2 top-3 z-30 rounded-md border border-border bg-white p-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          title="展开 AI 聊天"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      )}
    </>
  );
}

export function AppLayout() {
  return (
    <AppDndProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <CollapsedSidebarToggles />
        <ResizableLeftSidebar />
        <main className="flex-1 min-w-0 overflow-hidden">
          <EditorDropZone />
        </main>
        <ResizableRightSidebar />
      </div>
      <SlashCommandMenu />
    </AppDndProvider>
  );
}
