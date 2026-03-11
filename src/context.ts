import { ContextStorage } from './storage';
import { ContextRecord, ContextEvent, ContextQuery, ContextConfig } from './types';
import { join } from 'path';
import { promises as fs } from 'fs';

export class Ctx {
  private storage: ContextStorage;
  private config: ContextConfig;

  constructor(config?: ContextConfig) {
    this.config = config || this.getDefaultConfig();
    this.storage = new ContextStorage(this.config);
  }

  private getDefaultConfig(): ContextConfig {
    const cwd = process.cwd();
    const ctxDir = join(cwd, '.ctx');
    
    return {
      dataDir: ctxDir,
      dbPath: join(ctxDir, 'context.db'),
      eventsPath: join(ctxDir, 'events.log')
    };
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.config.dataDir, { recursive: true });
      
      // Secure directory permissions
      await fs.chmod(this.config.dataDir, 0o700); // owner only
      
      await this.storage.initialize();
      console.log('✅ Ctx initialized in', this.config.dataDir);
    } catch (error) {
      console.error('❌ Failed to initialize Ctx:', error);
      throw error;
    }
  }

  async record(record: ContextRecord): Promise<ContextEvent> {
    try {
      const event = await this.storage.record({
        type: record.event,
        data: record.data,
        agent: record.agent,
        session: record.session,
        confidence: record.confidence,
        model: record.model,
        prompt: record.prompt,
        metadata: record.metadata
      });

      await this.storage.logToFile(event);
      return event;
    } catch (error) {
      console.error('❌ Failed to record context:', error);
      throw error;
    }
  }

  async shouldIgnorePath(path: string): Promise<boolean> {
    return this.storage.shouldIgnore(path);
  }

  async createDefaultIgnoreFile(): Promise<void> {
    const ignorePath = join(this.config.dataDir, '.ctxignore');
    
    // Get the actual patterns from storage (which includes language detection)
    await this.storage.loadIgnorePatterns();
    const patterns = this.storage.getIgnorePatterns();
    
    // Deduplicate patterns while preserving order
    const unique = [...new Set(patterns)];
    
    const defaultContent = `# Ctx ignore patterns
# Similar to .gitignore but for context tracking
# Generated automatically based on project type detection

${unique.join('\n')}

# Add your custom patterns below this line
`;
    
    if (!(await fs.access(ignorePath).then(() => true).catch(() => false))) {
      await fs.writeFile(ignorePath, defaultContent);
    }
  }

  async query(query: ContextQuery): Promise<ContextEvent[]> {
    try {
      return await this.storage.query(query);
    } catch (error) {
      console.error('❌ Failed to query context:', error);
      throw error;
    }
  }

  async last(type?: string, limit: number = 10): Promise<ContextEvent[]> {
    return this.query({ type, limit });
  }

  async byAgent(agent: string, limit: number = 50): Promise<ContextEvent[]> {
    return this.query({ agent, limit });
  }

  async bySession(session: string, limit: number = 50): Promise<ContextEvent[]> {
    return this.query({ session, limit });
  }

  async close(): Promise<void> {
    await this.storage.close();
  }
}
