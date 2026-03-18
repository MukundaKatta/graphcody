# GraphCody

> AI-powered code intelligence platform that builds knowledge graphs of your codebase for semantic search, dependency visualization, and natural language code conversations.

## Features

- **Code Graph Visualizer** -- Interactive D3.js dependency and call-chain visualization across entire codebases
- **Semantic Code Search** -- Find code by meaning using embeddings and pgvector for lightning-fast results
- **Chat with Codebase** -- Ask architecture and logic questions with full graph-context AI answers
- **Impact Analysis** -- Trace dependencies through the full call graph before making changes
- **Code Navigation** -- Go-to-definition, find references, and trace call chains across projects
- **Code Review AI** -- Automated reviews with context-aware suggestions and pattern detection
- **Documentation Generator** -- Auto-generate JSDoc, markdown docs, and API references from code graphs
- **Onboarding Guides** -- Generate comprehensive guides for new developers
- **Cross-Repo Search** -- Search across multiple repositories simultaneously

## Tech Stack

| Layer     | Technology                                  |
| --------- | ------------------------------------------- |
| Framework | Next.js 14 (App Router)                     |
| Language  | TypeScript                                  |
| Backend   | Python (FastAPI/Uvicorn)                    |
| Graphs    | D3.js, d3-force                             |
| UI        | Tailwind CSS, Lucide React                  |
| Markdown  | react-markdown, remark-gfm, rehype-highlight|
| State     | Zustand, SWR                                |
| Validation| Zod                                         |
| Backend   | Supabase (Auth + Database)                  |

## Getting Started

```bash
# Install dependencies
npm install

# Run setup script
npm run setup

# Start frontend
npm run dev

# Start backend (separate terminal)
npm run backend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
graphcody/
├── app/
│   ├── page.tsx              # Landing page
│   └── (app)/
│       ├── dashboard/        # Project dashboard
│       ├── repos/            # Repository management
│       ├── search/           # Semantic search
│       ├── graph/            # Graph visualizer
│       ├── chat/             # Chat with codebase
│       ├── navigate/         # Code navigation
│       ├── impact/           # Impact analysis
│       ├── review/           # Code review
│       └── docs/             # Doc generator
├── backend/                  # Python FastAPI backend
└── package.json
```

