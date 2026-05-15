'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DocumentBlock, Chart3DData, TableContent, CodeContent } from '@/types/block';
import { chartsAPI, Chart3DCreateData } from '@/lib/api';
import { useDocumentStore } from '@/stores/documentStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAIChatStore } from '@/stores/aiChatStore';
import { useAppStore } from '@/stores/appStore';
import {
  BarChart3,
  Maximize2,
  Minimize2,
  Settings,
  Save,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Download,
  Table2,
  Code2,
  Sparkles,
} from 'lucide-react';

// 动态导入 Plotly 以避免 SSR 问题
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface Props {
  block: DocumentBlock;
  onUpdate?: (content: Record<string, unknown>) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function Chart3DBlock({ block, onUpdate }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [chartData, setChartData] = useState<Chart3DData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 编辑状态
  const [editTitle, setEditTitle] = useState('');
  const [editX, setEditX] = useState('');
  const [editY, setEditY] = useState('');
  const [editZ, setEditZ] = useState('');
  const [editXLabel, setEditXLabel] = useState('');
  const [editYLabel, setEditYLabel] = useState('');
  const [editZLabel, setEditZLabel] = useState('');

  // 获取当前文档的 blocks
  const blocks = useDocumentStore((s) => s.blocks);

  // 筛选出可导入的 blocks
  const tableBlocks = blocks.filter((b) => b.blockType === 'table' && b.id !== block.id);
  const codeBlocks = blocks.filter((b) => {
    if (b.blockType !== 'code') return false;
    const content = b.content as unknown as CodeContent;
    return content?.status === 'success';
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout>(null);

  // 从后端加载图表数据
  useEffect(() => {
    loadChartData();
  }, [block.id]);

  const loadChartData = async () => {
    try {
      setIsLoading(true);
      const response = await chartsAPI.getByBlock(block.id);
      if (response.chartConfig?.data) {
        setChartData(response.chartConfig.data as Chart3DData);
      } else {
        // 使用 block.content 中的数据（兼容旧格式）
        initFromBlockContent();
      }
    } catch {
      // 如果没有后端数据，使用 block.content
      initFromBlockContent();
    } finally {
      setIsLoading(false);
    }
  };

  const initFromBlockContent = () => {
    const content = block.content;
    if (content.x && Array.isArray(content.x)) {
      // 新格式
      setChartData({
        title: (content.title as string) || '3D 图表',
        source: content.source as string | undefined,
        chartType: (content.chartType as 'bar' | 'scatter' | 'surface') || 'bar',
        x: content.x as (string | number)[],
        y: content.y as (string | number)[],
        z: content.z as (string | number)[] | null | undefined,
        xLabel: content.xLabel as string | undefined,
        yLabel: content.yLabel as string | undefined,
        zLabel: content.zLabel as string | undefined,
      });
    } else if (content.bars && Array.isArray(content.bars)) {
      // 旧格式兼容
      const bars = content.bars as { label: string; height: number }[];
      setChartData({
        title: (content.title as string) || '3D 图表',
        source: content.source as string | undefined,
        chartType: 'bar',
        x: bars.map((b) => b.label),
        y: bars.map((b) => b.height),
        xLabel: 'X 轴',
        yLabel: 'Y 轴',
      });
    } else {
      // 默认示例数据
      setChartData({
        title: '3D 图表',
        chartType: 'bar',
        x: ['一月', '二月', '三月', '四月', '五月'],
        y: [10, 25, 15, 30, 20],
        xLabel: '月份',
        yLabel: '数值',
      });
    }
  };

  // 保存图表数据到后端
  const saveChartData = useCallback(
    async (data: Chart3DData) => {
      try {
        setSaveStatus('saving');
        const saveData: Chart3DCreateData = {
          documentId: block.documentId,
          sourceType: 'manual',
          dataJson: data as unknown as Record<string, unknown>,
        };
        await chartsAPI.saveByBlock(block.id, saveData);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    },
    [block.id, block.documentId]
  );

  // 防抖保存
  const debouncedSave = useCallback(
    (data: Chart3DData) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveChartData(data);
      }, 1000);
    },
    [saveChartData]
  );

  // 更新图表数据
  const updateChartData = useCallback(
    (newData: Chart3DData) => {
      setChartData(newData);
      debouncedSave(newData);
      if (onUpdate) {
        onUpdate(newData as unknown as Record<string, unknown>);
      }
    },
    [debouncedSave, onUpdate]
  );

  // 初始化编辑状态
  useEffect(() => {
    if (chartData && showEditor) {
      setEditTitle(chartData.title || '');
      setEditX(chartData.x?.join(', ') || '');
      setEditY(chartData.y?.join(', ') || '');
      setEditZ(chartData.z?.join(', ') || '');
      setEditXLabel(chartData.xLabel || '');
      setEditYLabel(chartData.yLabel || '');
      setEditZLabel(chartData.zLabel || '');
    }
  }, [chartData, showEditor]);

  // 解析逗号分隔的数值
  const parseValues = (str: string): (string | number)[] => {
    return str
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const num = Number(s);
        return isNaN(num) ? s : num;
      });
  };

  // 应用编辑
  const applyEdits = () => {
    if (!chartData) return;
    const newData: Chart3DData = {
      ...chartData,
      title: editTitle,
      x: parseValues(editX),
      y: parseValues(editY),
      z: editZ ? parseValues(editZ) : null,
      xLabel: editXLabel,
      yLabel: editYLabel,
      zLabel: editZLabel,
    };
    updateChartData(newData);
    setShowEditor(false);
  };

  // 从表格导入数据
  const importFromTable = (tableBlock: DocumentBlock) => {
    const content = tableBlock.content as unknown as TableContent;
    if (!content.headers || !content.rows || content.rows.length === 0) return;

    const headers = content.headers;
    const rows = content.rows;

    // 第一列作为 X 轴，其余列作为 Y 轴数据系列
    const xData = rows.map((row) => row[0] || '');

    // 如果有多列，取第二列作为 Y
    const yData = rows.map((row) => {
      const val = row[1] || '0';
      const num = Number(val);
      return isNaN(num) ? val : num;
    });

    // 如果有三列，取第三列作为 Z
    let zData: (string | number)[] | null = null;
    if (headers.length > 2) {
      zData = rows.map((row) => {
        const val = row[2] || '0';
        const num = Number(val);
        return isNaN(num) ? val : num;
      });
    }

    const newData: Chart3DData = {
      title: chartData?.title || `来自表格的数据`,
      chartType: zData ? 'scatter' : 'bar',
      x: xData,
      y: yData,
      z: zData,
      xLabel: headers[0] || 'X',
      yLabel: headers[1] || 'Y',
      zLabel: headers[2] || 'Z',
      source: `表格: ${headers.join(', ')}`,
    };

    updateChartData(newData);
    setShowImport(false);
    setShowEditor(false);
  };

  // 从代码输出导入数据
  const importFromCode = (codeBlock: DocumentBlock) => {
    const content = codeBlock.content as unknown as CodeContent;
    const output = content.output || '';

    // 尝试解析输出中的 JSON 数据
    try {
      // 查找 JSON 数据
      const jsonMatch = output.match(/[\[{][\s\S]*[\]}]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        let newData: Chart3DData;

        if (Array.isArray(parsed)) {
          // 数组格式
          if (parsed.length > 0 && typeof parsed[0] === 'object') {
            // 对象数组
            const keys = Object.keys(parsed[0]);
            const xData = parsed.map((item) => item[keys[0]] || '');
            const yData = parsed.map((item) => {
              const val = item[keys[1]];
              return typeof val === 'number' ? val : Number(val) || 0;
            });
            let zData: (string | number)[] | null = null;
            if (keys.length > 2) {
              zData = parsed.map((item) => {
                const val = item[keys[2]];
                return typeof val === 'number' ? val : Number(val) || 0;
              });
            }

            newData = {
              title: chartData?.title || '来自代码的数据',
              chartType: zData ? 'scatter' : 'bar',
              x: xData,
              y: yData,
              z: zData,
              xLabel: keys[0] || 'X',
              yLabel: keys[1] || 'Y',
              zLabel: keys[2] || 'Z',
              source: '代码输出',
            };
          } else {
            // 简单数组
            newData = {
              title: chartData?.title || '来自代码的数据',
              chartType: 'bar',
              x: parsed.map((_, i) => `Item ${i + 1}`),
              y: parsed.map((v) => (typeof v === 'number' ? v : Number(v) || 0)),
              xLabel: 'Index',
              yLabel: 'Value',
              source: '代码输出',
            };
          }
        } else if (typeof parsed === 'object' && parsed.x && parsed.y) {
          // 已有图表数据格式
          newData = {
            title: chartData?.title || '来自代码的数据',
            chartType: parsed.z ? 'scatter' : 'bar',
            x: parsed.x,
            y: parsed.y,
            z: parsed.z || null,
            xLabel: parsed.xLabel || 'X',
            yLabel: parsed.yLabel || 'Y',
            zLabel: parsed.zLabel || 'Z',
            source: '代码输出',
          };
        } else {
          return;
        }

        updateChartData(newData);
        setShowImport(false);
        setShowEditor(false);
      }
    } catch {
      // 解析失败，忽略
    }
  };

  // AI 解读图表
  const askAI = useCallback(() => {
    const askAIWithQuestion = useAIChatStore.getState().askAIWithQuestion;
    const rightSidebarCollapsed = useAppStore.getState().rightSidebarCollapsed;
    const toggleRightSidebar = useAppStore.getState().toggleRightSidebar;

    const preview = chartData
      ? `标题: ${chartData.title}\nX轴: ${chartData.x?.join(', ')}\nY轴: ${chartData.y?.join(', ')}${chartData.z ? `\nZ轴: ${chartData.z.join(', ')}` : ''}`
      : '';

    askAIWithQuestion('请解读这个图表的数据含义和趋势', {
      id: `block-${block.id}`,
      kind: 'block',
      title: chartData?.title || '3D 图表',
      icon: '▥',
      preview,
      docId: block.documentId,
      blockId: block.id,
      blockType: block.blockType,
    });

    if (rightSidebarCollapsed) toggleRightSidebar();
  }, [block.id, block.documentId, block.blockType, chartData]);

  // 渲染 Plotly 图表
  const renderPlotlyChart = () => {
    if (!chartData) return null;

    const hasZ = chartData.z && chartData.z.length > 0;
    const chartType = chartData.chartType || 'bar';

    let plotData: Partial<Plotly.Data>[];
    const layout: Partial<Plotly.Layout> = {
      title: { text: chartData.title },
      autosize: true,
      margin: { l: 50, r: 50, t: 50, b: 50 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'system-ui, sans-serif' },
    };

    if (chartType === 'surface' && hasZ) {
      // 3D 曲面图
      plotData = [
        {
          type: 'surface',
          x: chartData.x,
          y: chartData.y,
          z: chartData.z as number[],
          colorscale: 'Viridis',
        },
      ];
      layout.scene = {
        xaxis: { title: { text: chartData.xLabel || 'X' } },
        yaxis: { title: { text: chartData.yLabel || 'Y' } },
        zaxis: { title: { text: chartData.zLabel || 'Z' } },
      };
    } else if (chartType === 'scatter' && hasZ) {
      // 3D 散点图
      plotData = [
        {
          type: 'scatter3d',
          mode: 'markers',
          x: chartData.x,
          y: chartData.y,
          z: chartData.z as number[],
          marker: {
            size: 8,
            color: chartData.z as number[],
            colorscale: 'Viridis',
            showscale: true,
          },
        },
      ];
      layout.scene = {
        xaxis: { title: { text: chartData.xLabel || 'X' } },
        yaxis: { title: { text: chartData.yLabel || 'Y' } },
        zaxis: { title: { text: chartData.zLabel || 'Z' } },
      };
    } else {
      // 3D 柱状图（默认）
      plotData = [
        {
          type: 'bar',
          x: chartData.x,
          y: chartData.y,
          marker: {
            color: chartData.y as number[],
            colorscale: [
              [0, '#818cf8'],
              [0.5, '#6366f1'],
              [1, '#4f46e5'],
            ],
            showscale: true,
          },
        },
      ];
      layout.xaxis = { title: { text: chartData.xLabel || 'X 轴' } };
      layout.yaxis = { title: { text: chartData.yLabel || 'Y 轴' } };
    }

    return (
      <Plot
        data={plotData}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: true,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        }}
        className="w-full"
        useResizeHandler
        style={{ width: '100%', height: isExpanded ? '600px' : '400px' }}
      />
    );
  };

  // 渲染保存状态指示器
  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            保存中...
          </span>
        );
      case 'saved':
        return (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            已保存
          </span>
        );
      case 'error':
        return <span className="text-xs text-red-500">保存失败</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-white',
        isExpanded && 'fixed inset-4 z-50 flex flex-col'
      )}
    >
      {/* 工具栏 */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{chartData?.title || '3D 图表'}</span>
          {chartData?.source && (
            <span className="text-xs text-muted-foreground">({chartData.source})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {renderSaveStatus()}
          <Button
            variant="ghost"
            size="sm"
            onClick={askAI}
            title="AI 解读图表"
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEditor(!showEditor)}
            title="编辑数据"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* 图表区域 */}
      <div className={cn('p-4', isExpanded && 'flex-1 overflow-hidden')}>
        {renderPlotlyChart()}
      </div>

      {/* 数据编辑面板 */}
      {showEditor && (
        <div className="border-t p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">数据编辑</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImport(!showImport)}
                disabled={tableBlocks.length === 0 && codeBlocks.length === 0}
              >
                <Download className="mr-1 h-3 w-3" />
                导入数据
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowEditor(false)}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 导入数据面板 */}
          {showImport && (
            <div className="mb-4 rounded border bg-muted/50 p-3">
              <span className="mb-2 block text-xs font-medium text-muted-foreground">
                选择数据源
              </span>
              <div className="grid gap-2">
                {tableBlocks.length > 0 && (
                  <div>
                    <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Table2 className="h-3 w-3" />
                      表格数据
                    </span>
                    <div className="grid gap-1">
                      {tableBlocks.map((tb) => {
                        const tc = tb.content as unknown as TableContent;
                        return (
                          <Button
                            key={tb.id}
                            variant="ghost"
                            size="sm"
                            className="justify-start text-xs"
                            onClick={() => importFromTable(tb)}
                          >
                            {tc.headers?.join(' | ') || '未命名表格'}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {codeBlocks.length > 0 && (
                  <div>
                    <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Code2 className="h-3 w-3" />
                      代码输出
                    </span>
                    <div className="grid gap-1">
                      {codeBlocks.map((cb) => {
                        const cc = cb.content as unknown as CodeContent;
                        return (
                          <Button
                            key={cb.id}
                            variant="ghost"
                            size="sm"
                            className="justify-start text-xs"
                            onClick={() => importFromCode(cb)}
                          >
                            {(cc.code || '').substring(0, 50)}...
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {tableBlocks.length === 0 && codeBlocks.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    当前文档没有可导入的表格或代码输出
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">图表标题</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  X 轴数据（逗号分隔）
                </label>
                <input
                  type="text"
                  value={editX}
                  onChange={(e) => setEditX(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                  placeholder="一月, 二月, 三月"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Y 轴数据（逗号分隔）
                </label>
                <input
                  type="text"
                  value={editY}
                  onChange={(e) => setEditY(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                  placeholder="10, 20, 30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Z 轴数据（可选，逗号分隔）
                </label>
                <input
                  type="text"
                  value={editZ}
                  onChange={(e) => setEditZ(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                  placeholder="5, 15, 25"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">X 轴标签</label>
                <input
                  type="text"
                  value={editXLabel}
                  onChange={(e) => setEditXLabel(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Y 轴标签</label>
                <input
                  type="text"
                  value={editYLabel}
                  onChange={(e) => setEditYLabel(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Z 轴标签</label>
                <input
                  type="text"
                  value={editZLabel}
                  onChange={(e) => setEditZLabel(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowEditor(false)}>
                取消
              </Button>
              <Button size="sm" onClick={applyEdits}>
                <Save className="mr-1 h-3 w-3" />
                应用
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
