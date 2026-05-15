export interface Document {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  coverUrl?: string;
  sortOrder: number;
  path: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Document[];
  isOpen?: boolean;
}

export interface DocumentTreeNode {
  id: string;
  icon: string;
  title: string;
  children: DocumentTreeNode[];
  isOpen?: boolean;
}
