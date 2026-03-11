import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ContextEvent, ContextQuery, ContextConfig } from './types';
import { v4 as uuidv4 } from 'uuid';

export class ContextStorage {
  private db: sqlite3.Database;
  private config: ContextConfig;

  constructor(config: ContextConfig) {
    this.config = config;
    this.db = new sqlite3.Database(config.dbPath);
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            type TEXT NOT NULL,
            data TEXT,
            agent TEXT,
            session TEXT,
            confidence REAL,
            model TEXT,
            prompt TEXT,
            metadata TEXT
          )
        `);
        
        this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)
        `);
        
        this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)
        `);
        
        this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent)
        `);
        
        this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_events_session ON events(session)
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async record(event: Omit<ContextEvent, 'id' | 'timestamp'>): Promise<ContextEvent> {
    const contextEvent: ContextEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...event
    };

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO events (
          id, timestamp, type, data, agent, session, 
          confidence, model, prompt, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        contextEvent.id,
        contextEvent.timestamp,
        contextEvent.type,
        JSON.stringify(contextEvent.data),
        contextEvent.agent,
        contextEvent.session,
        contextEvent.confidence,
        contextEvent.model,
        contextEvent.prompt,
        JSON.stringify(contextEvent.metadata)
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(contextEvent);
        }
      });

      stmt.finalize();
    });
  }

  async query(query: ContextQuery): Promise<ContextEvent[]> {
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params: any[] = [];

    if (query.type) {
      sql += ' AND type = ?';
      params.push(query.type);
    }

    if (query.agent) {
      sql += ' AND agent = ?';
      params.push(query.agent);
    }

    if (query.session) {
      sql += ' AND session = ?';
      params.push(query.session);
    }

    if (query.since) {
      sql += ' AND timestamp >= ?';
      params.push(query.since);
    }

    if (query.until) {
      sql += ' AND timestamp <= ?';
      params.push(query.until);
    }

    sql += ' ORDER BY timestamp DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const events = rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            type: row.type,
            data: row.data ? JSON.parse(row.data) : null,
            agent: row.agent,
            session: row.session,
            confidence: row.confidence,
            model: row.model,
            prompt: row.prompt,
            metadata: row.metadata ? JSON.parse(row.metadata) : null
          }));
          resolve(events);
        }
      });
    });
  }

  async logToFile(event: ContextEvent): Promise<void> {
    const logEntry = JSON.stringify(event) + '\n';
    await fs.appendFile(this.config.eventsPath, logEntry);
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
