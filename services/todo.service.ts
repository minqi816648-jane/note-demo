import { getDB } from './db/database';
import type { Todo, TodoStatus, TodoPriority } from '../src/constants/theme';
import { generateUUID } from '../src/utils/uuid';
import { nowISO } from '../src/utils/date';
import { likePattern } from './search.service';

/**
 * 待办服务层
 * 提供 Todos 表的完整 CRUD 操作
 */
export class TodoService {
  /**
   * 创建待办
   */
  static async createTodo(data: Partial<Todo>): Promise<Todo> {
    const db = await getDB();
    const id = data.id || generateUUID();
    const now = nowISO();

    const todo: Todo = {
      id,
      note_id: data.note_id ?? null,
      title: data.title ?? '',
      description: data.description ?? null,
      status: data.status ?? 'pending',
      priority: data.priority ?? 2,
      due_date: data.due_date ?? null,
      remind_at: data.remind_at ?? null,
      completed_at: data.completed_at ?? null,
      source: data.source ?? 'manual',
      parent_todo_id: data.parent_todo_id ?? null,
      sort_order: data.sort_order ?? 0,
      is_deleted: 0,
      created_at: now,
      updated_at: now,
    };

    await db.runAsync(
      `INSERT INTO todos (
        id, note_id, title, description, status, priority, due_date,
        remind_at, completed_at, source, parent_todo_id, sort_order,
        is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        todo.id, todo.note_id, todo.title, todo.description, todo.status,
        todo.priority, todo.due_date, todo.remind_at, todo.completed_at,
        todo.source, todo.parent_todo_id, todo.sort_order, 0,
        todo.created_at, todo.updated_at,
      ]
    );

    return todo;
  }

  /**
   * 更新待办
   */
  static async updateTodo(id: string, data: Partial<Todo>): Promise<void> {
    const db = await getDB();
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields: (keyof Todo)[] = [
      'note_id', 'title', 'description', 'status', 'priority', 'due_date',
      'remind_at', 'completed_at', 'source', 'parent_todo_id', 'sort_order', 'is_deleted',
    ];

    for (const field of allowedFields) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push(data[field as keyof Todo]);
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(nowISO());
    values.push(id);

    await db.runAsync(
      `UPDATE todos SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * 切换待办完成状态
   */
  static async toggleTodo(id: string): Promise<void> {
    const db = await getDB();
    const todo = await TodoService.getTodoById(id);
    if (!todo) return;

    const now = nowISO();
    const isCompleted = todo.status === 'completed';

    await db.runAsync(
      'UPDATE todos SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?',
      [isCompleted ? 'pending' : 'completed', isCompleted ? null : now, now, id]
    );
  }

  /**
   * 软删除待办
   */
  static async softDeleteTodo(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      'UPDATE todos SET is_deleted = 1, updated_at = ? WHERE id = ?',
      [nowISO(), id]
    );
  }

  /**
   * 物理删除待办
   */
  static async hardDeleteTodo(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync('DELETE FROM todos WHERE id = ?', [id]);
  }

  /**
   * 按 ID 获取待办
   */
  static async getTodoById(id: string): Promise<Todo | null> {
    const db = await getDB();
    const todo = await db.getFirstAsync<Todo>(
      'SELECT * FROM todos WHERE id = ?',
      [id]
    );
    return todo ?? null;
  }

  /**
   * 获取待办列表（支持筛选）
   */
  static async getTodos(filter: {
    status?: TodoStatus;
    noteId?: string;
    dueDate?: string;
    searchText?: string;
    includeDeleted?: boolean;
  } = {}): Promise<Todo[]> {
    const db = await getDB();
    const conditions: string[] = [];
    const values: any[] = [];

    if (!filter.includeDeleted) {
      conditions.push('is_deleted = 0');
    }

    if (filter.status) {
      conditions.push('status = ?');
      values.push(filter.status);
    }

    if (filter.noteId) {
      conditions.push('note_id = ?');
      values.push(filter.noteId);
    }

    if (filter.dueDate) {
      conditions.push('date(due_date) = date(?)');
      values.push(filter.dueDate);
    }

    if (filter.searchText) {
      conditions.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
      const pattern = likePattern(filter.searchText);
      values.push(pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return await db.getAllAsync<Todo>(
      `SELECT * FROM todos ${whereClause} ORDER BY
        CASE status WHEN 'completed' THEN 1 ELSE 0 END,
        priority ASC,
        due_date ASC,
        created_at DESC`,
      values
    );
  }

  /**
   * 获取「今天」的待办
   * 规则：优先级为「急·今天」(2) 或提醒时间(remind_at)在今天，排除已完成
   */
  static async getTodayTodos(): Promise<Todo[]> {
    const db = await getDB();
    const today = new Date().toISOString().split('T')[0];
    return await db.getAllAsync<Todo>(
      `SELECT * FROM todos
       WHERE is_deleted = 0
         AND status != 'completed'
         AND (priority = 2 OR date(remind_at) = date(?))
       ORDER BY priority ASC, remind_at ASC`,
      [today]
    );
  }

  /**
   * 获取「加急」的待办
   * 规则：优先级为「加急」(3)，排除已完成
   */
  static async getUrgentTodos(): Promise<Todo[]> {
    const db = await getDB();
    return await db.getAllAsync<Todo>(
      `SELECT * FROM todos
       WHERE is_deleted = 0
         AND status != 'completed'
         AND priority = 3
       ORDER BY remind_at ASC, created_at DESC`
    );
  }

  /**
   * 获取「近7天」的待办
   * 规则：优先级为「普通」(1) 且提醒时间(remind_at)在未来7天内（不含今天）
   */
  static async getUpcomingTodos(days: number = 7): Promise<Todo[]> {
    const db = await getDB();
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return await db.getAllAsync<Todo>(
      `SELECT * FROM todos
       WHERE is_deleted = 0
         AND status != 'completed'
         AND priority = 1
         AND date(remind_at) > date(?)
         AND date(remind_at) <= date(?)
       ORDER BY date(remind_at) ASC, priority ASC`,
      [today, future]
    );
  }

  /**
   * 获取已完成待办
   */
  static async getCompletedTodos(): Promise<Todo[]> {
    const db = await getDB();
    return await db.getAllAsync<Todo>(
      `SELECT * FROM todos
       WHERE is_deleted = 0 AND status = 'completed'
       ORDER BY completed_at DESC`
    );
  }

  /**
   * 获取笔记关联的待办
   */
  static async getTodosByNoteId(noteId: string): Promise<Todo[]> {
    const db = await getDB();
    return await db.getAllAsync<Todo>(
      `SELECT * FROM todos
       WHERE note_id = ? AND is_deleted = 0
       ORDER BY created_at ASC`,
      [noteId]
    );
  }

  /**
   * 获取某个待办的子任务
   */
  static async getSubtasks(parentTodoId: string): Promise<Todo[]> {
    const db = await getDB();
    return await db.getAllAsync<Todo>(
      `SELECT * FROM todos
       WHERE parent_todo_id = ? AND is_deleted = 0
       ORDER BY priority ASC, created_at ASC`,
      [parentTodoId]
    );
  }

  /**
   * 获取某个待办的直接父任务
   */
  static async getParentTodo(todoId: string): Promise<Todo | null> {
    const db = await getDB();
    const todo = await TodoService.getTodoById(todoId);
    if (!todo?.parent_todo_id) return null;
    return TodoService.getTodoById(todo.parent_todo_id);
  }

  /**
   * 关联待办到笔记
   */
  static async attachTodoToNote(todoId: string, noteId: string): Promise<void> {
    await TodoService.updateTodo(todoId, { note_id: noteId });
  }

  /**
   * 解除待办与笔记的关联
   */
  static async detachTodoFromNote(todoId: string): Promise<void> {
    await TodoService.updateTodo(todoId, { note_id: null });
  }

  /**
   * 设置待办的父任务（挂为某个任务的子任务；传 null 则取消）
   */
  static async setTodoParent(todoId: string, parentTodoId: string | null): Promise<void> {
    await TodoService.updateTodo(todoId, { parent_todo_id: parentTodoId });
  }

  /**
   * 统计待办的未完成子任务数量
   */
  static async getSubtaskCount(parentTodoId: string): Promise<number> {
    const db = await getDB();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM todos
       WHERE parent_todo_id = ? AND is_deleted = 0 AND status != 'completed'`,
      [parentTodoId]
    );
    return result?.count ?? 0;
  }

  /**
   * 获取关联笔记的标题
   */
  static async getLinkedNoteTitle(noteId: string): Promise<string | null> {
    if (!noteId) return null;
    const db = await getDB();
    const note = await db.getFirstAsync<{ title: string }>(
      'SELECT title FROM notes WHERE id = ?',
      [noteId]
    );
    return note?.title ?? null;
  }

  /**
   * 获取待办统计
   */
  static async getTodoStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    today: number;
    overdue: number;
  }> {
    const db = await getDB();
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.getFirstAsync<{
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      today: number;
      overdue: number;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN date(due_date) = date(?) AND status != 'completed' THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN date(due_date) < date(?) AND status != 'completed' THEN 1 ELSE 0 END) as overdue
      FROM todos
      WHERE is_deleted = 0`,
      [today, today]
    );

    return {
      total: result?.total ?? 0,
      pending: result?.pending ?? 0,
      inProgress: result?.inProgress ?? 0,
      completed: result?.completed ?? 0,
      today: result?.today ?? 0,
      overdue: result?.overdue ?? 0,
    };
  }
}
