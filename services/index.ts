export {
  parseMarkdownNote,
  importMarkdownNote,
  importMarkdownNotes,
  readTextFile,
} from './import.service';
export { NoteService } from './note.service';
export { FolderService } from './folder.service';
export { CategoryService } from './category.service';
export { TagService } from './tag.service';
export { AttachmentService } from './attachment.service';
export { TodoService } from './todo.service';
export {
  searchNotes,
  searchTodos,
  searchAll,
  searchByTag,
  syncFtsForNote,
} from './search.service';
export type { SearchResultItem, SearchResults } from './search.service';
export { AIConversationService } from './ai/conversation.service';
export { aiSearch, summarizeNoteWithRefs } from './ai/aiSearch';
export type { AiSearchResult, AiSearchCitation } from './ai/aiSearch';
export {
  autoClassifyNote,
  rerunAutoClassify,
  confirmNoteClassification,
  markPendingNote,
} from './ai/autoClassify';
export {
  classifyNote,
  summarizeNote,
  getClient,
  getSmartClient,
  createClient,
  CATEGORY_SLUGS,
  translateText,
  polishText,
  continueText,
  extractTodosFromText,
} from './ai';
export type {
  AIClient,
  AIProviderName,
  AIMessageInput,
  AIStreamChunk,
  ClassificationResult,
  ExtractedTodo,
} from './ai';
export { getApiKey, saveApiKey, getConfiguredProviders } from './ai/keyStore';
export { SavedLinkService } from './savedLink.service';
export { fetchLinkMeta, categorizeUrl } from './linkMeta.service';
export type { LinkMeta } from './linkMeta.service';

// 注意：notification.service / voice.service / voiceRecord.service 触及原生模块
//（expo-notifications、expo-audio）。为避免任何原生环境下加载不必要模块，
//不在这里无条件导出，统一改为使用方按需动态导入。
