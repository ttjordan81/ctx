import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { ContextEvent, ContextQuery, ContextConfig } from './types';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore - minimatch types not available
import { minimatch } from 'minimatch';
import defaultIgnoreConfig from './default-ignore.json';

interface IgnoreConfig {
  version: string;
  description: string;
  patterns: Record<string, string[]>;
  language_specific: Record<string, string[]>;
}

export class ContextStorage {
  private db!: sqlite3.Database;
  private config: ContextConfig;
  private ignorePatterns: string[] = [];
  private eventCounts = new Map<string, number>();
  private readonly MAX_EVENT_SIZE = 1000000; // 1MB
  private readonly MAX_EVENTS_PER_HOUR = 1000;
  private ignoreConfig: IgnoreConfig;
  private initialized = false;

  constructor(config: ContextConfig) {
    this.config = config;
    this.ignoreConfig = defaultIgnoreConfig as IgnoreConfig;
  }

  async loadIgnorePatterns(): Promise<void> {
    // Start with universal patterns from config
    const universalPatterns = Object.values(this.ignoreConfig.patterns).flat();
    this.ignorePatterns = [...universalPatterns];
    
    // Detect project type and add language-specific patterns
    const detectedLanguages = await this.detectProjectLanguages();
    for (const lang of detectedLanguages) {
      const langPatterns = this.ignoreConfig.language_specific[lang];
      if (langPatterns) {
        this.ignorePatterns.push(...langPatterns);
      }
    }
    
    // Load custom patterns if file exists
    const ignorePath = join(this.config.dataDir, '.ctxignore');
    if (await fs.access(ignorePath).then(() => true).catch(() => false)) {
      const content = await fs.readFile(ignorePath, 'utf-8');
      const customPatterns = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      this.ignorePatterns = [...this.ignorePatterns, ...customPatterns];
    }
  }

  async detectProjectLanguages(): Promise<string[]> {
    const languages: string[] = [];
    const projectRoot = dirname(this.config.dataDir);
    
    try {
      const files = await fs.readdir(projectRoot);
      
      // JavaScript/Node.js
      if (files.includes('package.json') || files.includes('node_modules')) {
        languages.push('javascript');
      }
      
      // Python
      if (files.includes('requirements.txt') || 
          files.includes('setup.py') || 
          files.includes('pyproject.toml') ||
          files.some(f => f.endsWith('.py'))) {
        languages.push('python');
      }
      
      // Rust
      if (files.includes('Cargo.toml') || files.includes('Cargo.lock')) {
        languages.push('rust');
      }
      
      // Go
      if (files.includes('go.mod') || files.includes('go.sum')) {
        languages.push('go');
      }
      
      // Java
      if (files.includes('pom.xml') || files.includes('build.gradle') || 
          files.some(f => f.endsWith('.java'))) {
        languages.push('java');
      }
      
      // Ruby
      if (files.includes('Gemfile') || files.includes('Gemfile.lock')) {
        languages.push('ruby');
      }
      
      // PHP
      if (files.includes('composer.json') || files.includes('composer.lock')) {
        languages.push('php');
      }
      
      // C#/.NET
      if (files.includes('.csproj') || files.includes('packages.config')) {
        languages.push('csharp');
      }
      
      // C/C++
      if (files.includes('CMakeLists.txt') || files.includes('Makefile') ||
          files.some(f => f.endsWith('.cpp') || f.endsWith('.c') || f.endsWith('.h'))) {
        languages.push('cpp');
      }
      
    } catch (error) {
      // If detection fails, continue with universal patterns only
    }
    
    return languages;
  }

  shouldIgnore(path: string): boolean {
    return this.ignorePatterns.some(pattern => 
      minimatch(path, pattern, { dot: true, nocase: true })
    );
  }

  getIgnorePatterns(): string[] {
    return [...this.ignorePatterns];
  }

  validateEventData(data: any): boolean {
    if (data === null || data === undefined) return true;
    if (typeof data !== 'object') return false;
    if (JSON.stringify(data).length > this.MAX_EVENT_SIZE) return false;
    return true;
  }

  validateAgentName(agent: string): boolean {
    if (!agent) return true; // agent is optional
    return /^[a-zA-Z0-9_-]+$/.test(agent) && agent.length <= 50;
  }

  async checkRateLimit(agent?: string): Promise<boolean> {
    const key = `${agent || 'unknown'}:${new Date().toISOString().slice(0,13)}`; // hourly
    const count = this.eventCounts.get(key) || 0;
    if (count >= this.MAX_EVENTS_PER_HOUR) return false;
    this.eventCounts.set(key, count + 1);
    return true;
  }

  async initialize(): Promise<void> {
    // Open DB now that the data directory exists
    this.db = new sqlite3.Database(this.config.dbPath);
    
    // Load ignore patterns first
    await this.loadIgnorePatterns();
    
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Security settings
        this.db.run('PRAGMA foreign_keys = ON');
        this.db.run('PRAGMA journal_mode = WAL');
        this.db.run('PRAGMA synchronous = NORMAL');
        this.db.run('PRAGMA secure_delete = ON');
        
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
          else {
            this.initialized = true;
            resolve();
          }
        });
      });
    });
  }

  async ensureReady(): Promise<void> {
    if (this.initialized) return;
    await this.initialize();
  }

  async record(event: Omit<ContextEvent, 'id' | 'timestamp'>): Promise<ContextEvent> {
    await this.ensureReady();
    // Validation
    if (!this.validateEventData(event.data)) {
      throw new Error('Event data too large or invalid');
    }
    
    if (!this.validateAgentName(event.agent || '')) {
      throw new Error('Invalid agent name');
    }
    
    if (!(await this.checkRateLimit(event.agent))) {
      throw new Error('Rate limit exceeded');
    }
    
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
    await this.ensureReady();
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
    if (!this.initialized || !this.db) {
      return;
    }
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
