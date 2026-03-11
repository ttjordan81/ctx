# Ctx - Project Memory Built In

> **Git tracks code. Ctx tracks intelligence.**

## The Problem

Today, most projects have **no memory**.

Teams work inside folders full of documents, code, notes, and decisions. But the **reasoning behind the work is constantly lost**.

A team might have:

* a shared folder with documents
* a Git repository with code
* Slack conversations about decisions
* prompts used with AI tools
* analysis done with LLMs

But none of that context is **captured in one place**.

When someone joins the project, or when the team revisits the work months later, they have to ask:

* Why was this decision made?
* What prompt generated this document?
* What analysis led to this architecture?
* What discussions shaped this approach?

The project exists, but **the thinking behind it disappears**.

## The Idea

What if every project had **memory built into it**?

Imagine opening a folder and, alongside your documents or code, there was a small system that continuously captured:

* decisions made by the team
* prompts used with AI
* reasoning traces from agents
* analysis done on documents
* conversations that shaped the work

Instead of losing this context, the project would **remember how it evolved**.

## Example: A Team Document Folder

Imagine a shared folder like this:

```
grant-proposal/
├── documents/
│   ├── rfp.pdf
│   ├── proposal_draft.docx
│   └── research_notes.md
│
├── analysis/
│   └── scoring_matrix.xlsx
│
├── code/
│   └── data_parser.py
│
└── .ctx/
    ├── events.log
    ├── prompts/
    ├── decisions/
    └── agent_traces/
```

Inside `.ctx`, the project stores things like:

* the prompts used to analyze the RFP
* the reasoning behind scoring decisions
* agent outputs used to draft sections
* notes explaining why certain strategies were chosen

Now the project doesn't just contain **files**.

It contains the **memory of how the work happened**.

## Example: Coding Projects

A coding project might look like this:

```
my-app/
├── src/
├── tests/
├── package.json
├── README.md
└── .ctx/
```

Inside `.ctx`, the system records things like:

* prompts used to generate code
* architecture decisions
* reasoning behind refactoring
* AI-assisted debugging steps
* agent workflows that ran during development

Months later, the team can inspect:

```
ctx inspect
```

And see:

```
Feb 12 — Agent analyzed performance bottleneck
Feb 13 — Refactor recommended for API layer
Feb 14 — Prompt used to generate authentication module
Feb 15 — Decision made to move from Redis to Postgres cache
```

The project becomes **self-documenting**.

## The Big Idea

Git tracks **how code changes over time**.

But modern work involves much more than code.

Projects now include:

* AI prompts
* document analysis
* reasoning steps
* decisions made with LLMs
* agent workflows

All of this context currently **disappears**.

**Ctx** introduces a simple concept:

**Every project should have memory.**

A lightweight system inside the project folder captures:

* decisions
* prompts
* reasoning
* agent activity

So the project doesn't just contain files.

It contains the **history of how the thinking evolved**.

> **Git tracks code. Ctx tracks intelligence.**

## 📦 Installation

```bash
npm install -g @contextlab/ctx
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
const { Ctx } = require('@contextlab/ctx');

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

# Ignore patterns
ctx ignore --list           # List current ignore patterns
ctx ignore "*.log"          # Add a pattern
ctx ignore -r "*.log"       # Remove a pattern

# Git hooks
ctx hook install    # Install post-commit + pre-push hooks
ctx hook remove     # Remove Ctx hooks
ctx hook status     # Show installed hooks

# Query options
  -t, --type      # Filter by event type
  -a, --agent     # Filter by agent
  -s, --session   # Filter by session
  --since         # Events since date
  --until         # Events until date
  -l, --limit     # Limit results
```

## � Git Hooks

Ctx can automatically record context when you commit or push code, creating a timeline of your project's evolution.

### Auto-detection

During `ctx init`, if a Git repository is detected, Ctx will offer to install hooks:

```
🔗 Git repository detected.

  Ctx can automatically record context when you commit or push code.
  This creates a timeline of your project's evolution — every commit
  and push becomes part of your project's memory.

  Install Git hooks? (Y/n)
```

### What gets recorded

**On `git commit`** (runs in background — doesn't slow Git):
```json
{
  "event": "git_commit",
  "data": {
    "hash": "391f474",
    "message": "add login route",
    "author": "Tim Jordan",
    "branch": "main",
    "files_changed": "src/auth.ts,src/routes.ts"
  },
  "agent": "git"
}
```

**On `git push`** (runs synchronously — records before code leaves):
```json
{
  "event": "git_push",
  "data": {
    "remote": "origin",
    "branch": "main",
    "commits_pushed": 3
  },
  "agent": "git"
}
```

### Manual management

```bash
ctx hook install    # Install hooks anytime
ctx hook remove     # Remove hooks (preserves other Git hooks)
ctx hook status     # Check which hooks are active
ctx init --no-hooks # Skip the hooks prompt during init
```

## �� Integration Examples

### Express.js Middleware
```javascript
const { Ctx } = require('@contextlab/ctx');
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
import { Ctx } from '@contextlab/ctx';

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
