'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Play, Pause, Volume2, VolumeX, Loader2, X } from 'lucide-react';
import { DocumentBlock } from '@/types/block';
import { uploadFile, filesAPI, type FileUploadProgress } from '@/lib/api';
import { useDocumentStore } from '@/stores/documentStore';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function AudioBlock({ block, onUpdate }: Props) {
  const currentDocId = useDocumentStore((s) => s.currentDocId);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileUrl = block.content.fileUrl as string | undefined;
  const fileId = block.content.fileId as string | undefined;
  const fileName = block.content.fileName as string | undefined;

  // 同步音频状态
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      setIsPlaying(false);
      setUploadError('音频无法加载，请检查文件格式或重新上传');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, [fileUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !fileUrl) return;
    if (isPlaying) {
      audio.pause();
    } else {
      setUploadError(null);
      audio.play().catch(() => {
        setIsPlaying(false);
        setUploadError('音频无法播放，请检查文件格式或重新上传');
      });
    }
  }, [isPlaying, fileUrl]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const vol = parseFloat(e.target.value);
    audio.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  }, []);

  const handleRemove = useCallback(async () => {
    setUploadError(null);
    if (fileId) {
      try {
        await filesAPI.delete(fileId);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : '删除失败');
        return;
      }
    }
    onUpdate({});
  }, [fileId, onUpdate]);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !currentDocId) return;

      // 校验文件类型
      if (!file.type.startsWith('audio/')) {
        setUploadError('请选择音频文件');
        return;
      }

      // 校验文件大小 (50MB)
      if (file.size > 50 * 1024 * 1024) {
        setUploadError('音频文件不能超过 50MB');
        return;
      }

      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(null);

      try {
        const result = await uploadFile(file, currentDocId, block.id, (progress) => {
          setUploadProgress(progress);
        });

        onUpdate({
          fileId: result.id,
          fileName: result.fileName,
          fileUrl: filesAPI.getUrl(result.id),
          duration: 0,
        });
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : '上传失败');
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    },
    [currentDocId, block.id, onUpdate]
  );

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // 无文件时显示上传区域
  if (!fileUrl) {
    return (
      <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center hover:border-muted-foreground/50 transition-colors">
        <input
          type="file"
          accept="audio/*"
          onChange={handleUpload}
          className="hidden"
          id={`audio-upload-${block.id}`}
          disabled={isUploading}
        />
        <label
          htmlFor={`audio-upload-${block.id}`}
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <span className="text-sm text-muted-foreground">
                上传中... {uploadProgress ? `${uploadProgress.percent}%` : ''}
              </span>
              {uploadProgress && (
                <div className="w-full max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">点击或拖拽上传音频文件</span>
              <span className="text-xs text-muted-foreground/60">支持 MP3、WAV、OGG 等格式，最大 50MB</span>
            </>
          )}
        </label>
        {uploadError && (
          <p className="text-xs text-destructive mt-2">{uploadError}</p>
        )}
      </div>
    );
  }

  // 有文件时显示播放器
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <audio ref={audioRef} src={fileUrl} preload="metadata" />

      {/* 文件名 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Volume2 className="h-4 w-4 shrink-0" />
        <span className="truncate">{fileName || '音频文件'}</span>
        <button
          onClick={handleRemove}
          className="ml-auto h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
          title="移除音频"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 播放控制 */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
          {formatTime(currentTime)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 accent-primary cursor-pointer"
        />

        <span className="text-xs text-muted-foreground w-10 tabular-nums">
          {formatTime(duration)}
        </span>

        <button
          onClick={toggleMute}
          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-16 h-1 accent-primary cursor-pointer"
        />
      </div>
      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
      )}
    </div>
  );
}
