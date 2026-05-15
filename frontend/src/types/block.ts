export type BlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'text'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'table'
  | 'quote'
  | 'divider'
  | 'code'
  | 'whiteboard'
  | 'chart3d'
  | 'image'
  | 'file'
  | 'audio'
  | 'video'
  | 'doclink'
  | 'ai-answer';

export interface DocumentBlock {
  id: string;
  documentId: string;
  parentBlockId?: string;
  blockType: BlockType;
  content: Record<string, unknown>;
  properties?: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TodoItem {
  text: string;
  done: boolean;
}

export interface TableCell {
  text: string;
}

export interface TableContent {
  headers: string[];
  rows: string[][];
}

export interface CodeContent {
  language: string;
  code: string;
  output?: string;
  stderr?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  executionTime?: string;
}

export interface DocLinkContent {
  targetDocId: string;
  icon: string;
  title: string;
}

export interface WhiteboardPath {
  tool: 'pen' | 'eraser';
  points: { x: number; y: number }[];
}

export interface WhiteboardData {
  paths: WhiteboardPath[];
}

export interface Chart3DData {
  title: string;
  source?: string;
  chartType?: 'bar' | 'scatter' | 'surface';
  x: (string | number)[];
  y: (string | number)[];
  z?: (string | number)[] | null;
  xLabel?: string;
  yLabel?: string;
  zLabel?: string;
  // 兼容旧格式
  bars?: { label: string; height: number }[];
}

export interface AudioContent {
  fileId?: string;
  fileName?: string;
  fileUrl?: string;
  duration?: number;
}

export interface VideoContent {
  fileId?: string;
  fileName?: string;
  fileUrl?: string;
  duration?: number;
  posterUrl?: string;
}

export interface SlashMenuItem {
  id: BlockType;
  icon: string;
  name: string;
  desc: string;
}

export interface SlashMenuSection {
  sec: string;
  items: SlashMenuItem[];
}
