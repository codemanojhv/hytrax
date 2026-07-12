# Hytrax

**Makes your AI coding agent stop repeating mistakes.**

A local, deterministic knowledge layer for AI coding agents.
Hytrax has no LLM of its own — the host agent's LLM does all reasoning.

```bash
npm install -D hytrax
npx hytrax init
npx hytrax plan "build a landing page"
```

## Commands

| Command | Purpose |
|---------|---------|
| `hytrax init` | Create `.hytrax/` in your project |
| `hytrax plan "task"` | Prepare execution manifest (orchestrates searches) |
| `hytrax search "query"` | Find knowledge + outcomes by tag/keyword |
| `hytrax record --build passed` | Record a task outcome |
| `hytrax query "query"` | Human-readable search |
| `hytrax validate` | Check `.hytrax/` for issues |
| `hytrax stats` | Outcome statistics |
| `hytrax knowledge add` | Scaffold a new OKF file |

## Project Structure

```
project/
├── .hytrax/
│   ├── config.toml
│   ├── knowledge/
│   │   ├── architecture/     System architecture
│   │   ├── constraints/      Must-follow rules
│   │   ├── patterns/         Accepted conventions + patterns
│   │   └── workflows/        Process workflows
│   └── outcomes/
│       └── outcomes.jsonl
└── node_modules/
    └── hytrax/
```

Committed to git. Shared by every developer + CI.

## How It Works

```
Agent's LLM gets a task
  ├── hytrax plan "task"        ← orchestrates multiple searches
  ├── hytrax search "query"     ← deterministic tag/keyword matching
  ├── hytrax record --build     ← stores outcome
  └── hytrax knowledge add      ← scaffolds new OKF
```

Hytrax owns data. The host agent's LLM owns intelligence.

## Why Not...

- **SQLite?** Files are fast enough, git-friendly, no database to manage.
- **Vector search?** Tags + keywords work. The LLM decides relevance.
- **Daemon?** CLI is zero-infrastructure. No background process needed.
- **MCP?** CLI works with any agent that can execute commands.
- **Own LLM?** Your agent already has one. Don't duplicate it.

## License

MIT
