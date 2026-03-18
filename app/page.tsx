import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-surface-900 to-brand-900">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white">GraphCody</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-400 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-4 py-1.5 text-sm text-brand-300 mb-6">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-slow" />
            AI-Powered Code Intelligence
          </div>
          <h1 className="text-6xl font-extrabold text-white mb-6 leading-tight">
            Understand Entire
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-400">
              Codebases Instantly
            </span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
            GraphCody builds a knowledge graph of your code, enabling semantic search,
            dependency visualization, impact analysis, and AI-powered conversations
            with your entire codebase.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-400 transition-colors shadow-lg shadow-brand-500/25"
            >
              Start Exploring
            </Link>
            <Link
              href="/graph"
              className="px-8 py-3.5 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors backdrop-blur"
            >
              View Demo
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Code Graph Visualizer",
              description: "Interactive D3.js visualization of dependencies, call chains, and imports across your codebase.",
              icon: "M13 10V3L4 14h7v7l9-11h-7z",
            },
            {
              title: "Semantic Code Search",
              description: "Find code by meaning, not just keywords. Powered by embeddings and pgvector for lightning-fast results.",
              icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
            },
            {
              title: "Chat with Codebase",
              description: "Ask questions about architecture, patterns, and logic. AI uses full graph context for accurate answers.",
              icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
            },
            {
              title: "Impact Analysis",
              description: "Know exactly what breaks before making changes. Trace dependencies through the full call graph.",
              icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
            },
            {
              title: "Code Navigation",
              description: "Go to definition, find all references, and trace call chains across your entire project.",
              icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
            },
            {
              title: "Code Review AI",
              description: "Automated code reviews with context-aware suggestions, pattern detection, and best practice checks.",
              icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
            },
            {
              title: "Documentation Generator",
              description: "Auto-generate JSDoc, markdown docs, API references, and README files from your code graph.",
              icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
            },
            {
              title: "Onboarding Guides",
              description: "Generate comprehensive onboarding guides that help new developers understand the codebase fast.",
              icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
            },
            {
              title: "Cross-Repo Search",
              description: "Search across multiple repositories simultaneously. Find shared patterns and dependencies.",
              icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-white/50">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-sm text-white/30">GraphCody - AI Coding Assistant</p>
          <p className="text-sm text-white/30">Built with Next.js, Supabase, and D3.js</p>
        </div>
      </footer>
    </div>
  );
}
