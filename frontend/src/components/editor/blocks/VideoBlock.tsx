'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, X } from 'lucide-react';
import { DocumentBlock } from '@/types/block';
import { uploadFile, filesAPI, type FileUploadProgress } from '@/lib/api';
import { useDocumentStore } from '@/stores/documentStore';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function VideoBlock({ block, onUpdate }: Props) {
  const currentDocId = useDocumentStore((s) => s.currentDocId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileUrl = block.content.fileUrl as string | undefined;
  const fileId = block.content.fileId as string | undefined;
  const fileName = block.content.fileName as string | undefined;
  const posterUrl = block.content.posterUrl as string | undefined;

  // 同步视频状态
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setDuration(video.duration);
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('ended', onEnded);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [fileUrl]);

  // 监听全屏状态变化
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !fileUrl) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying, fileUrl]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const vol = parseFloat(e.target.value);
    video.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
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
      if (!file.type.startsWith('video/')) {
        setUploadError('请选择视频文件');
        return;
      }

      // 校验文件大小 (200MB)
      if (file.size > 200 * 1024 * 1024) {
        setUploadError('视频文件不能超过 200MB');
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
          accept="video/*"
          onChange={handleUpload}
          className="hidden"
          id={`video-upload-${block.id}`}
          disabled={isUploading}
        />
        <label
          htmlFor={`video-upload-${block.id}`}
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
              <span className="text-sm text-muted-foreground">点击或拖拽上传视频文件</span>
              <span className="text-xs text-muted-foreground/60">支持 MP4、WebM 等格式，最大 200MB</span>
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
    <div ref={containerRef} className={`rounded-lg border bg-black overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
      <video
        ref={videoRef}
        src={fileUrl}
        poster={posterUrl}
        preload="metadata"
        className={`w-full ${isFullscreen ? 'h-full object-contain' : 'max-h-[500px]'}`}
        onClick={togglePlay}
      />

      {/* 控制栏 */}
      <div className="bg-background/95 backdrop-blur p-2 space-y-1">
        {/* 进度条 */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 accent-primary cursor-pointer"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="h-7 w-7 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>

          <span className="text-xs text-muted-foreground tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* 文件名 */}
          <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:block">
            {fileName || '视频文件'}
          </span>

          {/* 音量 */}
          <button
            onClick={toggleMute}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
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

          {/* 全屏 */}
          <button
            onClick={toggleFullscreen}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={handleRemove}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
            title="移除视频"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {uploadError && (
        <div className="bg-background px-2 pb-2 text-xs text-destructive">{uploadError}</div>
      )}
    </div>
  );
}
