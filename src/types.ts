export interface ContextEvent {
  id: string;
  timestamp: string;
  type: string;
  data?: Record<string, any>;
  agent?: string;
  session?: string;
  confidence?: number;
  model?: string;
  prompt?: string;
  metadata?: Record<string, any>;
}

export interface ContextQuery {
  type?: string;
  agent?: string;
  session?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}

export interface ContextConfig {
  dataDir: string;
  dbPath: string;
  eventsPath: string;
}

export interface ContextRecord {
  event: string;
  data?: Record<string, any>;
  agent?: string;
  session?: string;
  confidence?: number;
  model?: string;
  prompt?: string;
  metadata?: Record<string, any>;
}
