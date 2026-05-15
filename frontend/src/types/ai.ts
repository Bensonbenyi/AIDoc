export interface AIMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  attachments?: AIChatAttachment[];
  citations?: AICitation[];
  retrieval?: string;
  isLoading?: boolean;
}

export interface AICitation {
  docId: string;
  blockId: string;
  path: string;
}

export type AIScope = 'doc' | 'tree' | 'all';

export interface AIChatAttachment {
  id: string;
  kind: 'document' | 'block';
  title: string;
  icon?: string;
  preview?: string;
  docId?: string;
  blockId?: string;
  blockType?: string;
}
