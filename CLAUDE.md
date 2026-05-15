# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. 开发总原则
- 先阅读memory-bank/progress.md文件了解当前进度
- 阅读docs/plan.md,实现下一未完成的阶段
- 一次只完成一个阶段
- 完成一个阶段后，记录进度到memory-bank/progress.md
- 每个阶段完成后必须可以运行
- 每个阶段完成后必须说明修改了哪些文件
- 每个阶段完成后必须说明如何人为测试

## Project Overview

AIDoc is an AI-native interactive document system — a Notion/AFFiNE-like block editor with integrated AI chat, Python code execution, 3D charts, and whiteboard. Currently only the frontend UI prototype exists (all data is mock). Backend development is planned per `docs/plan.md`.

## Commands

All commands run from `frontend/` directory:

```bash
npm run dev      # Start dev server (Next.js)
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint
```

No test framework is configured yet.

## Architecture

### Three-Panel Layout (`AppLayout.tsx`)
- **Left**: Document tree sidebar (`DocumentTree.tsx`) — resizable, collapsible
- **Center**: Block editor (`DocumentEditor.tsx`) with breadcrumb path
- **Right**: AI assistant panel (`AIAssistantPanel.tsx`) — resizable, collapsible
- A global `SlashCommandMenu` overlay renders at the app level

### Block System
All document content is stored as typed blocks (`DocumentBlock`). Block types: `h1`, `h2`, `h3`, `text`, `bullet`, `numbered`, `todo`, `table`, `quote`, `divider`, `code`, `whiteboard`, `chart3d`, `image`, `file`, `audio`, `video`, `doclink`, `ai-answer`.

- `BlockRenderer.tsx` dispatches to individual components in `blocks/` via switch statement
- Block content is `Record<string, unknown>` with shape varying by type (e.g., `{text}` for headings, `{items}` for lists, `{headers, rows}` for tables)
- New block types need: component in `blocks/`, entry in `BlockRenderer.tsx` switch, entry in `blocks/index.ts`, default content in `documentStore.ts`, slash menu item in `mock-data.ts`

### Editor Mechanics
- Uses native `contentEditable` divs (NOT a rich text library like Tiptap/BlockNote)
- `BaseTextLine` — contentEditable divs inserted between blocks for inline text entry
- Typing `/` in a BaseTextLine opens `SlashCommandMenu` (filterable, keyboard-navigable)
- Arrow keys navigate between blocks; Enter creates new text block; Backspace moves to previous
- Cmd+Z undoes last block change (max 50 history entries per doc, stored in Zustand)
- Blocks are drag-sortable via @dnd-kit

### State Management (Zustand)
Three stores in `src/stores/`:
- **`appStore`** — UI state: sidebar visibility/width, active doc ID, highlighted block, slash menu state
- **`documentStore`** — Data: document tree, blocks per doc, current doc metadata, undo history. All mock.
- **`aiChatStore`** — AI chat messages, pending attachments, scope (doc/tree/all). Mock responses via setTimeout.

### Key Type Definitions (`src/types/`)
- `DocumentBlock` — id, documentId, blockType, content, sortOrder, timestamps
- `DocumentTreeNode` — id, icon, title, children[], isOpen
- `AIMessage` — id, role (user|ai), text, attachments, citations
- `AIScope` — 'doc' | 'tree' | 'all'

## Conventions

- **All UI text is Chinese (zh-CN)** — component labels, placeholder text, mock data
- **Path alias**: `@/*` maps to `./src/*`
- **Styling**: Tailwind CSS v4 only (CSS-based config in `globals.css` via `@theme inline`, no `tailwind.config.ts`). Use `cn()` from `@/lib/utils` to merge classes.
- **Components**: All interactive components use `'use client'` directive
- **shadcn/ui**: Style "base-nova", base color neutral, CSS variables enabled. Primitives in `src/components/ui/`. Add new ones with `npx shadcn@latest add <component>`.
- **Icons**: Use `lucide-react`
- **No backend yet**: All data comes from `mock-data.ts`. No API calls exist. `lib/api.ts` is planned but not created.

## Key Files

- `docs/tech.md` — Full technical design (data models, API specs, RAG design, environment variables)
- `docs/plan.md` — 13-phase development implementation plan
- `src/lib/mock-data.ts` — All mock data: document tree, blocks, AI responses, slash menu items
- `src/lib/editor-interactions.ts` — Caret placement, focus management, selection utilities
- `src/lib/slash-command.ts` — Slash command definitions and event constants
- `frontend/ui-prototype/proto-index.html` — Early HTML prototype (reference only)

## Backend (Planned, Not Yet Implemented)

- FastAPI (Python) + SQLAlchemy async + PostgreSQL + pgvector
- Package management: `uv` (pyproject.toml, not requirements.txt)
- LLM: Zhipu AI GLM-5.1 / Embedding: Alibaba Qwen text-embedding-v4
- Code execution: Pyodide (frontend-side)
- See `docs/plan.md` for the full implementation roadmap
