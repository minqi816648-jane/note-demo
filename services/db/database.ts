import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SEED_DATA_SQL, MIGRATIONS_SQL, DB_VERSION } from './schema';

let db: SQLite.SQLiteDatabase | null = null;
// 防止多个调用方并发触发 initDB 导致重复 openDatabaseAsync（Android 上会引发
// NativeDatabase.prepareAsync 空指针）。所有地方共用同一个初始化 promise。
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// 串行化所有数据库语句执行。
// Android 上 expo-sqlite 的异步 API 并发 prepareAsync 会触发
// NativeDatabase.prepareAsync NullPointerException，此处用一个 promise 队列
// 保证任意时刻只有一条语句在被编译/执行，从而彻底规避该崩溃。
let dbQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = dbQueue.then(task, task);
  // 无论成功失败都要继续队列，同时把错误向上传播给当前调用方
  dbQueue = run.catch(() => {});
  return run;
}

/**
 * 数据库访问统一走 getDB() 串行化代理。
 * 注意：全局 promise 队列串行化所有语句以规避 Android prepareAsync NPE；
 * 因此不要在此引入事务（withTransactionAsync + 嵌套 enqueue 会自死锁），
 * 多步写的一致性问题应在上层用补偿或重试策略解决。
 */

export async function initDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = doInit();
  return dbInitPromise;
}

async function doInit(): Promise<SQLite.SQLiteDatabase> {
  const opened = await SQLite.openDatabaseAsync('note.db');
  db = opened;

  // 启用外键约束
  await enqueue(() => opened.execAsync('PRAGMA foreign_keys = ON;'));
  // 启用 WAL 模式提升性能
  await enqueue(() => opened.execAsync('PRAGMA journal_mode = WAL;'));

  // 检查数据库版本，执行迁移
  await migrateIfNeeded(opened);

  console.log('Database initialized successfully');
  return opened;
}

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    await initDB();
  }
  // 返回一个串行化的代理：所有异步语句都经过 enqueue，避免并发 prepareAsync NPE。
  return new Proxy(db!, {
    // runAsync / getFirstAsync / getAllAsync 需要参数，透传给原生方法
    get(target, prop, receiver) {
      const value = (target as any)[prop];
      if (typeof value !== 'function') {
        return value;
      }
      return (...args: any[]) => enqueue(() => value.apply(target, args));
    },
  });
}

// 数据库迁移
async function migrateIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DB_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    // 首次初始化：建表 + 预置数据
    await db.execAsync(CREATE_TABLES_SQL);
    await db.execAsync(SEED_DATA_SQL);
  } else {
    // 增量迁移：从 currentVersion+1 到 DB_VERSION
    for (let v = currentVersion + 1; v <= DB_VERSION; v++) {
      const sql = MIGRATIONS_SQL[v];
      if (sql) {
        await db.execAsync(sql);
        console.log(`Apply migration to version ${v}`);
      }
    }
  }

  // 更新数据库版本
  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
  console.log(`Database migrated to version ${DB_VERSION}`);
}