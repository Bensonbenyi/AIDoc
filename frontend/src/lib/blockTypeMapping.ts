/**
 * 前后端 block_type 映射
 *
 * 前端使用简写形式，后端使用完整形式
 */

const frontendToBackend: Record<string, string> = {
  h1: 'heading_1',
  h2: 'heading_2',
  h3: 'heading_3',
  text: 'paragraph',
  bullet: 'bullet_list',
  numbered: 'numbered_list',
  doclink: 'link_to_document',
  chart3d: 'chart_3d',
  'ai-answer': 'ai_answer',
};

const backendToFrontend: Record<string, string> = {
  heading_1: 'h1',
  heading_2: 'h2',
  heading_3: 'h3',
  paragraph: 'text',
  bullet_list: 'bullet',
  numbered_list: 'numbered',
  link_to_document: 'doclink',
  chart_3d: 'chart3d',
  ai_answer: 'ai-answer',
};

/** 前端 block_type 转后端 */
export function toBackendBlockType(frontendType: string): string {
  return frontendToBackend[frontendType] || frontendType;
}

/** 后端 block_type 转前端 */
export function toFrontendBlockType(backendType: string): string {
  return backendToFrontend[backendType] || backendType;
}
