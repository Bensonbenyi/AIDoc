'use client';

import { Columns3, Plus, Rows3, Trash2 } from 'lucide-react';
import { DocumentBlock } from '@/types/block';

interface Props {
  block: DocumentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function TableBlock({ block, onUpdate }: Props) {
  const rawHeaders = (block.content.headers as string[]) || [];
  const headers = rawHeaders.length > 0 ? rawHeaders : ['列 1'];
  const rawRows = (block.content.rows as string[][]) || [];
  const rows = rawRows.length > 0 ? rawRows : [headers.map(() => '')];

  const updateHeader = (idx: number, val: string) => {
    const newHeaders = [...headers];
    newHeaders[idx] = val;
    onUpdate({ ...block.content, headers: newHeaders });
  };

  const updateCell = (rowIdx: number, colIdx: number, val: string) => {
    const newRows = rows.map((r) => headers.map((_, idx) => r[idx] || ''));
    newRows[rowIdx][colIdx] = val;
    onUpdate({ ...block.content, rows: newRows });
  };

  const addRow = () => {
    const newRow = headers.map(() => '');
    onUpdate({ ...block.content, rows: [...rows, newRow] });
  };

  const addCol = () => {
    onUpdate({
      ...block.content,
      headers: [...headers, '新列'],
      rows: rows.map((r) => [...headers.map((_, idx) => r[idx] || ''), '']),
    });
  };

  const deleteRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    onUpdate({ ...block.content, headers, rows: rows.filter((_, idx) => idx !== rowIdx) });
  };

  const deleteCol = (colIdx: number) => {
    if (headers.length <= 1) return;
    onUpdate({
      ...block.content,
      headers: headers.filter((_, idx) => idx !== colIdx),
      rows: rows.map((r) => r.filter((_, idx) => idx !== colIdx)),
    });
  };

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="group min-w-28 border-b border-border px-3 py-2 text-left font-semibold text-foreground/80"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="min-w-0 flex-1 outline-none"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => updateHeader(i, e.currentTarget.textContent || '')}
                      dangerouslySetInnerHTML={{ __html: h }}
                    />
                    <button
                      type="button"
                      onClick={() => deleteCol(i)}
                      disabled={headers.length <= 1}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/45 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="删除列"
                      aria-label={`删除第 ${i + 1} 列`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-9 border-b border-border" aria-label="行操作" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="group/row border-b border-border last:border-0">
                {headers.map((_, ci) => (
                  <td
                    key={ci}
                    className="px-3 py-2 text-foreground/80 outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCell(ri, ci, e.currentTarget.textContent || '')}
                    dangerouslySetInnerHTML={{ __html: row[ci] || '' }}
                  />
                ))}
                <td className="w-9 px-1 py-1.5">
                  <button
                    type="button"
                    onClick={() => deleteRow(ri)}
                    disabled={rows.length <= 1}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/45 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-0 group-hover/row:opacity-100 focus:opacity-100"
                    title="删除行"
                    aria-label={`删除第 ${ri + 1} 行`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-indigo-500"
        >
          <Plus className="h-3.5 w-3.5" />
          <Rows3 className="h-3.5 w-3.5" />
          添加行
        </button>
        <button
          type="button"
          onClick={addCol}
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-indigo-500"
        >
          <Plus className="h-3.5 w-3.5" />
          <Columns3 className="h-3.5 w-3.5" />
          添加列
        </button>
      </div>
    </div>
  );
}
