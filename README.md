# Ctx - Project Memory for AI Agents

> **Ctx** gives your project a memory. Every project today has no memory. Each time you start or return to a project, you're essentially beginning from a blank slate.

> What if your project had agents living inside it—agents that remember decisions, retain prompts, and preserve the reasoning traces behind how the project evolved?

## 🎯 The Problem

**Every project today has no memory.**

Each time you start or return to a project, you're essentially beginning from a blank slate. Decisions are forgotten, prompts are lost, and the reasoning behind how your project evolved vanishes into thin air.

What if your project had agents living inside it—agents that remember decisions, retain prompts, and preserve the reasoning traces behind how the project evolved?

## 🚀 The Solution

**Ctx** gives your project a memory—agents that live inside your project and remember everything:

- **Decisions**: Why choices were made and what influenced them
- **Prompts**: The exact prompts that produced successful results  
- **Reasoning**: The thought processes behind project evolution
- **Context**: The complete history of how your project came to be

Now your project has agents that remember decisions, retain prompts, and preserve the reasoning traces behind how the project evolved.

```
my-app/
 ├── src/
 ├── package.json
 └── .ctx/
      ├── context.db     # SQLite database
      ├── events.log     # Human-readable log
      ├── agents/        # Agent-specific data
      └── sessions/      # Session tracking
```

## 📦 Installation

```bash
npm install -g ctx
```

## 🎮 Quick Start

### Initialize a context repository

```bash
ctx init
```

### Record AI events

```bash
# Log a proposal analysis
ctx log proposal_scored -d '{"rfp": "NYSDOH-2026-22", "score": 0.78}' -a "analyzer-agent" -m "gpt-4" -c 0.84

# Log a user interaction
ctx log user_query -d '{"query": "show me recent reports", "intent": "data_request"}' -s "session_123"
```

### Query your context

```bash
# Show recent events
ctx inspect

# Query by agent
ctx query -a "analyzer-agent" -l 5

# Query by event type
ctx query -t proposal_scored --since 2026-03-10
```

## 💻 Node.js SDK

```javascript
const { Ctx } = require('ctx');

const context = new Ctx();

// Record events programmatically
await context.record({
  event: 'proposal_scored',
  data: { rfp: 'NYSDOH-2026-22', score: 0.78 },
  agent: 'analyzer-agent',
  model: 'gpt-4',
  confidence: 0.84
});

// Query context
const recent = await context.last('proposal_scored', 10);
const byAgent = await context.byAgent('analyzer-agent');
```

## 🏗️ Architecture

### Core Concepts

- **Events**: Individual actions, decisions, or observations
- **Agents**: AI systems or components that perform actions  
- **Sessions**: Logical groupings of related events
- **Context**: The complete memory of an AI system

### Storage

- **SQLite**: Fast, reliable structured storage
- **Event Log**: Human-readable append-only log
- **Indexes**: Optimized queries by type, agent, session, time

## 🎯 Use Cases

### 1. Agent Workflows
```javascript
// Track multi-agent processes
await context.record({
  event: 'workflow_started',
  data: { workflow: 'rfp_analysis', steps: 5 },
  agent: 'orchestrator'
});

// Each agent reports progress
await context.record({
  event: 'step_completed',
  data: { step: 'document_parsing', files: 12 },
  agent: 'parser-agent'
});
```

### 2. Prompt Engineering
```javascript
// Track prompt evolution
await context.record({
  event: 'prompt_test',
  data: { 
    prompt: 'Analyze this RFP for compliance...',
    version: 'v3.2',
    result: 'high_quality'
  },
  model: 'gpt-4',
  confidence: 0.91
});
```

### 3. Decision Auditing
```javascript
// Record AI decisions with reasoning
await context.record({
  event: 'decision_made',
  data: {
    decision: 'approve_proposal',
    reasoning: 'Meets all technical requirements',
    factors: ['budget_fit', 'timeline_realistic', 'team_available']
  },
  agent: 'evaluation-agent',
  confidence: 0.87
});
```

## 📊 CLI Commands

```bash
# Repository management
ctx init          # Initialize .ctx directory
ctx status        # Show repository status

# Event management
ctx log <event>   # Record new event
ctx query         # Search events
ctx inspect       # Show recent events

# Query options
  -t, --type      # Filter by event type
  -a, --agent     # Filter by agent
  -s, --session   # Filter by session
  --since         # Events since date
  --until         # Events until date
  -l, --limit     # Limit results
```

## 🔄 Integration Examples

### Express.js Middleware
```javascript
const { Ctx } = require('ctx');
const context = new Ctx();

// Auto-log API calls
app.use(async (req, res, next) => {
  await context.record({
    event: 'api_request',
    data: { 
      method: req.method, 
      path: req.path,
      user: req.user?.id 
    },
    session: req.sessionId
  });
  next();
});
```

### LangChain Integration
```javascript
import { Ctx } from 'ctx';

const context = new Ctx();

// Wrap LLM calls with context tracking
async function trackedLLM(prompt, options = {}) {
  const result = await llm.call(prompt);
  
  await context.record({
    event: 'llm_call',
    data: { prompt, result },
    model: options.model,
    confidence: result.confidence
  });
  
  return result;
}
```

## 🚀 Roadmap

### v0.2 - Enhanced Queries
- Full-text search across events
- Time-series aggregations
- Context graph visualization

### v0.3 - Collaboration
- Context sharing (`ctx push`, `ctx pull`)
- Team workspaces
- Conflict resolution

### v0.4 - Advanced Features
- Event replay / time travel
- Context embeddings
- Automated insights

## 🤝 Why This Matters

AI systems are becoming critical infrastructure. Without proper memory and traceability:

- **Debugging** is impossible
- **Reproducibility** is lost  
- **Collaboration** breaks down
- **Compliance** becomes a nightmare

**Ctx** solves this by providing the missing memory layer that every AI system needs.

---

> **Git tracks code history. Ctx tracks AI reasoning history.**

Made with ❤️ for the AI development community.
