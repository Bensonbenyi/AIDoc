import { DocumentBlock } from '@/types/block';

const MENU_WIDTH = 280;
const MENU_HEIGHT = 360;
const MENU_GAP = 8;

function cssEscape(value: string) {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
}

export function getEditorText(element: HTMLElement) {
  return element.innerText || element.textContent || '';
}

export function slashMenuPositionFromSelection(fallbackElement: HTMLElement) {
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const commonAncestor = range?.commonAncestorContainer;
  const isInside =
    !!commonAncestor &&
    (fallbackElement === commonAncestor || fallbackElement.contains(commonAncestor));

  const rect = isInside ? range.getBoundingClientRect() : fallbackElement.getBoundingClientRect();
  const fallbackRect = fallbackElement.getBoundingClientRect();
  const anchorX = rect.width || rect.height ? rect.left : fallbackRect.left;
  const anchorY = rect.width || rect.height ? rect.top : fallbackRect.top;
  const left = Math.max(8, Math.min(anchorX, window.innerWidth - MENU_WIDTH - 8));
  const topAbove = anchorY - MENU_HEIGHT - MENU_GAP;
  const top = topAbove >= 8 ? topAbove : Math.min(anchorY + 24, window.innerHeight - MENU_HEIGHT - 8);

  return { x: left, y: Math.max(8, top) };
}

export function placeCaretAtEnd(element: HTMLElement) {
  element.focus();

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const end = element.value.length;
    element.setSelectionRange(end, end);
    return;
  }

  if (!element.isContentEditable) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function placeCaretAtStart(element: HTMLElement) {
  element.focus();

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.setSelectionRange(0, 0);
    return;
  }

  if (!element.isContentEditable) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function editorFocusTarget(container: HTMLElement) {
  return (
    container.querySelector<HTMLElement>('[data-editor-focus-target="true"]') ||
    container.querySelector<HTMLElement>('textarea, input, [contenteditable="true"]') ||
    container
  );
}

export function focusEditorTarget(blockId?: string) {
  const container = blockId
    ? document.querySelector<HTMLElement>(`[data-block-id="${cssEscape(blockId)}"]`)
    : document.querySelector<HTMLElement>('[data-base-line-index="0"]');
  const target = container ? editorFocusTarget(container) : null;

  if (target) {
    placeCaretAtEnd(target);
  }
}

export function focusBlockEditorTarget(blockId: string, placement: 'start' | 'end' = 'end') {
  const container = document.querySelector<HTMLElement>(`[data-block-id="${cssEscape(blockId)}"]`);
  const target = container ? editorFocusTarget(container) : null;

  if (!target) return;

  if (placement === 'start') {
    placeCaretAtStart(target);
    return;
  }

  placeCaretAtEnd(target);
}

export function focusBaseTextLine(insertIndex: number, placement: 'start' | 'end' = 'end') {
  const target = document.querySelector<HTMLElement>(`[data-base-line-index="${insertIndex}"]`);
  if (target) {
    if (placement === 'start') {
      placeCaretAtStart(target);
      return;
    }

    placeCaretAtEnd(target);
  }
}

export function focusBaseTextLineAfterBlock(blockId: string) {
  const block = document.querySelector<HTMLElement>(`[data-block-id="${cssEscape(blockId)}"]`);
  const target = block?.nextElementSibling;
  if (target instanceof HTMLElement && target.dataset.baseLineIndex) {
    placeCaretAtEnd(target);
  }
}

export function focusedEditableElement(container: HTMLElement) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !container.contains(active)) return null;

  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active.isContentEditable
  ) {
    return active;
  }

  return null;
}

function focusedEditableText(container: HTMLElement) {
  const active = focusedEditableElement(container);
  if (!active) return null;

  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    return active.value;
  }

  if (active.isContentEditable) {
    return getEditorText(active);
  }

  return null;
}

export function isEditableSelectionAtStart(element: HTMLElement) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.selectionStart === 0 && element.selectionEnd === 0;
  }

  if (!element.isContentEditable) return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;

  const range = selection.getRangeAt(0);
  const commonAncestor = range.commonAncestorContainer;
  if (element !== commonAncestor && !element.contains(commonAncestor)) return false;

  const beforeCaret = range.cloneRange();
  beforeCaret.selectNodeContents(element);
  beforeCaret.setEnd(range.startContainer, range.startOffset);
  return beforeCaret.toString().length === 0;
}

export function isEditableSelectionAtEnd(element: HTMLElement) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const end = element.value.length;
    return element.selectionStart === end && element.selectionEnd === end;
  }

  if (!element.isContentEditable) return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;

  const range = selection.getRangeAt(0);
  const commonAncestor = range.commonAncestorContainer;
  if (element !== commonAncestor && !element.contains(commonAncestor)) return false;

  const afterCaret = range.cloneRange();
  afterCaret.selectNodeContents(element);
  afterCaret.setStart(range.endContainer, range.endOffset);
  return afterCaret.toString().length === 0;
}

function isValueEmpty(value: unknown) {
  return typeof value !== 'string' || value.trim().length === 0;
}

export function isBlockEmpty(block: DocumentBlock, container?: HTMLElement | null) {
  const liveText = container ? focusedEditableText(container) : null;
  if (liveText !== null) return liveText.trim().length === 0;

  switch (block.blockType) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'text':
    case 'quote':
    case 'image':
    case 'file':
      return isValueEmpty(block.content.text);
    case 'bullet':
    case 'numbered':
      return !Array.isArray(block.content.items) || block.content.items.every(isValueEmpty);
    case 'todo':
      return (
        !Array.isArray(block.content.items) ||
        block.content.items.every((item) => isValueEmpty((item as { text?: unknown }).text))
      );
    case 'code':
      return isValueEmpty(block.content.code);
    case 'table': {
      const headers = Array.isArray(block.content.headers) ? block.content.headers : [];
      const rows = Array.isArray(block.content.rows) ? block.content.rows : [];
      return headers.every(isValueEmpty) && rows.flat().every(isValueEmpty);
    }
    case 'divider':
      return true;
    case 'whiteboard':
      return !Array.isArray(block.content.paths) || block.content.paths.length === 0;
    case 'chart3d':
      return !Array.isArray(block.content.bars) || block.content.bars.length === 0;
    default:
      return false;
  }
}
