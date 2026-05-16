'use client';

import { useState, useRef, useEffect } from 'react';
import { DocumentBlock } from '@/types/block';
import { ImageIcon, X, Loader2 } from 'lucide-react';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function ImageBlock({ block, onUpdate }: Props) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileName = block.content.fileName as string | undefined;
  const fileUrl = block.content.fileUrl as string | undefined;
  const alt = (block.content.alt as string) || '';

  // 清理 blob URL 防止内存泄漏
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    setUploading(true);

    // 使用本地 blob URL 进行预览（不依赖后端）
    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);

    // 模拟上传完成
    setTimeout(() => {
      onUpdate({
        fileName: file.name,
        fileUrl: blobUrl,
        alt: file.name,
      });
      setUploading(false);
    }, 500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleRemove = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onUpdate({});
  };

  const displayUrl = fileUrl || previewUrl;

  if (displayUrl) {
    return (
      <div className="relative group">
        <img
          src={displayUrl}
          alt={alt}
          className="max-w-full rounded-lg border border-border"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleRemove}
            className="p-1.5 bg-background/80 backdrop-blur-sm rounded-md border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {fileName && (
          <div className="text-xs text-muted-foreground mt-1">{fileName}</div>
        )}
      </div>
    );
  }

  if (uploading) {
    return (
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-dashed">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <div className="flex-1">
          <div className="text-sm">处理中...</div>
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
      <ImageIcon className="w-8 h-8 text-muted-foreground" />
      <div className="text-sm text-muted-foreground text-center">
        <div>点击或拖拽上传图片</div>
        <div className="text-xs mt-1">支持 JPG、PNG、GIF、WebP，最大 10MB</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
    </div>
  );
}
