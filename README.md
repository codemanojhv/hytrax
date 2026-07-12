# Hytrax

**Makes your AI coding agent stop repeating mistakes.**

Hytrax is a local, deterministic knowledge layer for AI coding agents.
It stores project knowledge, records outcomes, and lets your agent's own
LLM do all the reasoning.

```bash
npm install -D hytrax
npx hytrax init
npx hytrax plan "build a landing page"
```

## Commands

| Command | What it does |
|---------|-------------|
| `hytrax init` | Create `.hytrax/` in your project |
| `hytrax plan "task"` | Prepare execution context (orchestrates searches) |
| `hytrax search "query"` | Find knowledge + outcomes by tag/keyword |
| `hytrax record --build passed` | Record a task outcome |
| `hytrax query "search"` | Human-readable search |
| `hytrax validate` | Check `.hytrax/` integrity |
| `hytrax stats` | Outcome statistics |
| `hytrax knowledge add --type arch --title "X"` | Scaffold new OKF |

## How it works

Hytrax has no LLM of its own. Your agent's LLM is the brain.
Hytrax is the structured data layer.

```
Your agent's LLM
  ├── hytrax plan "task"       ← gets structured context
  ├── hytrax search "auth"     ← finds relevant knowledge
  ├── hytrax record --build    ← saves outcome
  └── hytrax knowledge add     ← scaffolds new knowledge
```

## Per-project

```
my-project/
├── .hytrax/
│   ├── config.toml
│   ├── knowledge/
│   │   └── *.okf
│   └── outcomes/
│       └── outcomes.jsonl
└── node_modules/
```

Committed to git. Shared by every developer + CI.

## Philosophy

- **Hytrax owns data.** The host agent's LLM owns intelligence.
- **No LLM of its own.** No extra API calls. No extra cost.
- **Deterministic search.** Tag matching, not embeddings.
- **No SQLite, no daemon, no MCP.** Just files and a CLI.



## License

MIT
