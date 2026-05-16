'use client';

import { useState, useRef } from 'react';
import { DocumentBlock } from '@/types/block';
import { filesAPI } from '@/lib/api';
import { Upload, FileIcon, X, Loader2, Download } from 'lucide-react';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function FileBlock({ block, onUpdate }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileId = block.content.fileId as string | undefined;
  const fileName = block.content.fileName as string | undefined;
  const fileUrl = block.content.fileUrl as string | undefined;
  const fileSize = block.content.fileSize as number | undefined;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert('文件大小不能超过 50MB');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const result = await filesAPI.upload(file, block.documentId, block.id, (p) => setProgress(p.percent));
      onUpdate({
        fileId: result.id,
        fileName: file.name,
        fileUrl: `/api/files/${result.id}`,
        fileSize: file.size,
      });
    } catch (err) {
      console.error('上传失败:', err);
      alert('文件上传失败');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleRemove = () => {
    onUpdate({});
  };

  if (fileId && fileName) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border group">
        <FileIcon className="w-8 h-8 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{fileName}</div>
          {fileSize && (
            <div className="text-xs text-muted-foreground">{formatSize(fileSize)}</div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {fileUrl && (
            <a
              href={fileUrl}
              download={fileName}
              className="p-1.5 rounded-md hover:bg-background transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={handleRemove}
            className="p-1.5 rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (uploading) {
    return (
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-dashed">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <div className="flex-1">
          <div className="text-sm">上传中...</div>
          <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-3 p-6 bg-muted/50 rounded-lg border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Upload className="w-8 h-8 text-muted-foreground" />
      <div className="text-sm text-muted-foreground text-center">
        <div>点击或拖拽上传文件</div>
        <div className="text-xs mt-1">最大 50MB</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
    </div>
  );
}
