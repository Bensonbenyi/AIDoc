import { create } from 'zustand';

interface SlashMenuContext {
  docId: string;
  insertIndex?: number;
  replaceBlockId?: string;
  initialText?: string;
  sourceLineId?: string;
}

interface AppState {
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  activeDocId: string;
  highlightedBlockId: string | null;
  slashMenuOpen: boolean;
  slashMenuPosition: { x: number; y: number } | null;
  slashMenuContext: SlashMenuContext | null;

  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarWidth: (w: number) => void;
  setRightSidebarWidth: (w: number) => void;
  setActiveDocId: (id: string) => void;
  setHighlightedBlockId: (id: string | null) => void;
  openSlashMenu: (x: number, y: number, context?: SlashMenuContext) => void;
  updateSlashMenu: (x: number, y: number, context?: Partial<SlashMenuContext>) => void;
  closeSlashMenu: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false,
  leftSidebarWidth: 260,
  rightSidebarWidth: 360,
  activeDocId: 'design',
  highlightedBlockId: null,
  slashMenuOpen: false,
  slashMenuPosition: null,
  slashMenuContext: null,

  toggleLeftSidebar: () => set((s) => ({ leftSidebarCollapsed: !s.leftSidebarCollapsed })),
  toggleRightSidebar: () => set((s) => ({ rightSidebarCollapsed: !s.rightSidebarCollapsed })),
  setLeftSidebarWidth: (w) => set({ leftSidebarWidth: w }),
  setRightSidebarWidth: (w) => set({ rightSidebarWidth: w }),
  setActiveDocId: (id) => set({ activeDocId: id }),
  setHighlightedBlockId: (id) => set({ highlightedBlockId: id }),
  openSlashMenu: (x, y, context) =>
    set({ slashMenuOpen: true, slashMenuPosition: { x, y }, slashMenuContext: context || null }),
  updateSlashMenu: (x, y, context) =>
    set((s) =>
      s.slashMenuOpen && s.slashMenuContext
        ? {
            slashMenuPosition: { x, y },
            slashMenuContext: { ...s.slashMenuContext, ...context },
          }
        : s
    ),
  closeSlashMenu: () => set({ slashMenuOpen: false, slashMenuPosition: null, slashMenuContext: null }),
}));
