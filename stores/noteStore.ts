import { create } from 'zustand';
import { NoteService, FolderService, CategoryService, TagService } from '../services';
import type { Note, Folder, Category, Tag, NoteFilter } from '../src/constants/theme';

interface NoteState {
  // 状态
  notes: Note[];
  folders: Folder[];
  categories: Category[];
  tags: Tag[];
  currentFolderId: string | null;
  selectedNoteId: string | null;
  filter: NoteFilter;
  isLoading: boolean;
  error: string | null;

  // 笔记操作
  fetchNotes: (filter?: NoteFilter) => Promise<void>;
  createNote: (data: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  moveNote: (id: string, folderId: string | null) => Promise<void>;
  setSelectedNote: (id: string | null) => void;
  setFilter: (filter: NoteFilter) => void;

  // 文件夹操作
  fetchFolders: () => Promise<void>;
  createFolder: (data: Partial<Folder>) => Promise<Folder>;
  updateFolder: (id: string, data: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  setCurrentFolder: (id: string | null) => void;

  // 分类操作
  fetchCategories: () => Promise<void>;
  createCategory: (data: Partial<Category>) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // 标签操作
  fetchTags: () => Promise<void>;
  createTag: (name: string, color?: string) => Promise<Tag>;
  updateTag: (id: string, data: Partial<Tag>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addTagToNote: (noteId: string, tagName: string) => Promise<Tag>;
  removeTagFromNote: (noteId: string, tagId: string) => Promise<void>;

  // 通用
  clearError: () => void;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  // 初始状态
  notes: [],
  folders: [],
  categories: [],
  tags: [],
  currentFolderId: null,
  selectedNoteId: null,
  filter: {},
  isLoading: false,
  error: null,

  // ========== 笔记操作 ==========

  fetchNotes: async (filter) => {
    set({ isLoading: true, error: null });
    try {
      const mergedFilter = { ...get().filter, ...filter };
      const notes = await NoteService.getNotes(mergedFilter);
      set({ notes, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createNote: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const note = await NoteService.createNote(data);
      set((state) => ({
        notes: [note, ...state.notes],
        isLoading: false,
      }));
      return note;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateNote: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await NoteService.updateNote(id, data);
      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === id ? { ...n, ...data, updated_at: new Date().toISOString() } : n
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteNote: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await NoteService.softDeleteNote(id);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  restoreNote: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await NoteService.restoreNote(id);
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  toggleFavorite: async (id) => {
    try {
      await NoteService.toggleFavorite(id);
      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === id ? { ...n, is_favorite: n.is_favorite === 1 ? 0 : 1, updated_at: new Date().toISOString() } : n
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  moveNote: async (id, folderId) => {
    try {
      await NoteService.moveNote(id, folderId);
      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === id ? { ...n, parent_id: folderId, updated_at: new Date().toISOString() } : n
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  setSelectedNote: (id) => set({ selectedNoteId: id }),

  setFilter: (filter) => {
    set({ filter });
    get().fetchNotes(filter);
  },

  // ========== 文件夹操作 ==========

  fetchFolders: async () => {
    set({ isLoading: true, error: null });
    try {
      const folders = await FolderService.getAllFolders();
      set({ folders, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createFolder: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const folder = await FolderService.createFolder(data);
      set((state) => ({
        folders: [...state.folders, folder],
        isLoading: false,
      }));
      return folder;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateFolder: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await FolderService.updateFolder(id, data);
      set((state) => ({
        folders: state.folders.map((f) =>
          f.id === id ? { ...f, ...data, updated_at: new Date().toISOString() } : f
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteFolder: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await FolderService.softDeleteFolder(id);
      set((state) => ({
        folders: state.folders.filter((f) => f.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  setCurrentFolder: (id) => {
    set({ currentFolderId: id });
    get().fetchNotes({ folderId: id });
  },

  // ========== 分类操作 ==========

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await CategoryService.getAllCategories();
      set({ categories, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createCategory: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const category = await CategoryService.createCategory(data);
      set((state) => ({
        categories: [...state.categories, category],
        isLoading: false,
      }));
      return category;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateCategory: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await CategoryService.updateCategory(id, data);
      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await CategoryService.deleteCategory(id);
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // ========== 标签操作 ==========

  fetchTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const tags = await TagService.getAllTags();
      set({ tags, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createTag: async (name, color) => {
    set({ isLoading: true, error: null });
    try {
      const tag = await TagService.createTag(name, color);
      set((state) => ({
        tags: [...state.tags, tag],
        isLoading: false,
      }));
      return tag;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateTag: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await TagService.updateTag(id, data);
      set((state) => ({
        tags: state.tags.map((t) =>
          t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteTag: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await TagService.deleteTag(id);
      set((state) => ({
        tags: state.tags.filter((t) => t.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  addTagToNote: async (noteId, tagName) => {
    try {
      const tag = await TagService.addTagToNote(noteId, tagName);
      set((state) => ({
        tags: state.tags.some((t) => t.id === tag.id)
          ? state.tags.map((t) =>
              t.id === tag.id ? { ...t, usage_count: t.usage_count + 1 } : t
            )
          : [...state.tags, tag],
      }));
      return tag;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  removeTagFromNote: async (noteId, tagId) => {
    try {
      await TagService.removeTagFromNote(noteId, tagId);
      set((state) => ({
        tags: state.tags.map((t) =>
          t.id === tagId ? { ...t, usage_count: Math.max(0, t.usage_count - 1) } : t
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // ========== 通用 ==========

  clearError: () => set({ error: null }),
}));
