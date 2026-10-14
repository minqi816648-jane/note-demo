import { create } from 'zustand';
import { TodoService } from '../services';
import type { Todo, TodoStatus } from '../src/constants/theme';

type TodoFilter = 'today' | 'urgent' | 'upcoming' | 'completed' | 'all';

interface TodoState {
  // 状态
  todos: Todo[];
  filter: TodoFilter;
  isLoading: boolean;
  error: string | null;

  // 操作
  fetchTodos: (filter?: TodoFilter) => Promise<void>;
  createTodo: (data: Partial<Todo>) => Promise<Todo>;
  updateTodo: (id: string, data: Partial<Todo>) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  setFilter: (filter: TodoFilter) => void;
  clearError: () => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  // 初始状态
  todos: [],
  filter: 'today',
  isLoading: false,
  error: null,

  // ========== 操作 ==========

  fetchTodos: async (filter) => {
    const activeFilter = filter || get().filter;
    set({ isLoading: true, error: null });

    try {
      let todos: Todo[] = [];

      switch (activeFilter) {
        case 'today':
          todos = await TodoService.getTodayTodos();
          break;
        case 'urgent':
          todos = await TodoService.getUrgentTodos();
          break;
        case 'upcoming':
          todos = await TodoService.getUpcomingTodos(7);
          break;
        case 'completed':
          todos = await TodoService.getCompletedTodos();
          break;
        case 'all':
        default:
          todos = await TodoService.getTodos();
          break;
      }

      set({ todos, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createTodo: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const todo = await TodoService.createTodo(data);
      set((state) => ({
        todos: [todo, ...state.todos],
        isLoading: false,
      }));
      return todo;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateTodo: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await TodoService.updateTodo(id, data);
      set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  toggleTodo: async (id) => {
    try {
      await TodoService.toggleTodo(id);
      set((state) => ({
        todos: state.todos.map((t) => {
          if (t.id !== id) return t;
          const isCompleted = t.status === 'completed';
          return {
            ...t,
            status: isCompleted ? 'pending' : 'completed',
            completed_at: isCompleted ? null : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteTodo: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await TodoService.softDeleteTodo(id);
      set((state) => ({
        todos: state.todos.filter((t) => t.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  setFilter: (filter) => {
    set({ filter });
    get().fetchTodos(filter);
  },

  clearError: () => set({ error: null }),
}));
