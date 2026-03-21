# Elasticsearch Agent Blog Series — Reference Guide

This document is a reference for the three standalone Elasticsearch blog posts extracted from the AgentEngine + MaaS framework series. Use it to track differentiation, cross-references, source material locations, and the editorial rationale behind each post.

---

## Overview

| # | Blog Title | File | Category | Status |
|---|-----------|------|----------|--------|
| 1 | Building Production Agent Memory with Elasticsearch | `src/content/blog/elasticsearch-production-agent-memory.md` | Agentic AI | Draft |
| 2 | Data Streams and ILM for AI Agent Lifecycles | `src/content/blog/elasticsearch-data-streams-agent-lifecycle.md` | Agentic AI / Inside Elastic | Draft |
| 3 | Context Engineering for Production Agents with Elasticsearch | `src/content/blog/elasticsearch-context-engineering-agents.md` | Agentic AI | Draft |

**Format:** 3 standalone posts, not a series. Each targets a different reader persona, maps to different Search Labs categories, and can be read independently. No post depends on another.

**Why not a series:** (1) Each feature cluster maps to different Search Labs categories. (2) Recent Search Labs agent posts are standalone. (3) Separate posts maximize reach across reader interests. (4) No artificial dependency between posts.

**Excluded from extraction:** Part 2 (MaaS) — purely MCP/FastMCP architecture, no ES features to extract.

**Relationship to exec blog:** `elasticsearch-ai-backbone-exec.md` covers the strategic "one engine" pitch. These three posts are implementation-focused complements — they go deep on how, not why.

---

## Blog 1: Building Production Agent Memory with Elasticsearch

### Pitch (one paragraph)

Goes beyond basic RAG/chat-history demos to implement a quad-core memory system (episodic, semantic, procedural, state) backed entirely by Elasticsearch. Shows production-grade hybrid search with RRF and post-RRF reranking, plus a `recall_memory` tool that gives the LLM agency over its own retrieval — so it only loads context when it needs it.

### Elasticsearch Features Covered

| Feature | How It's Used |
|---------|--------------|
| `semantic_text` field type | Automatic chunking + embedding generation at index time |
| Inference endpoints (Jina v3, ELSER v2) | Dense + sparse embeddings for the same `semantic_text` field |
| RRF retriever | Merges `match` + `semantic` queries without score calibration |
| `rank_constant` tuning | Set to 60 to spread influence across ranked results |
| Oversampling (top_k × 3) | Fetches 3× candidates before client-side reranking |
| Client-side reranking | Time-decay on `@timestamp` + `log1p(importance_score)` weighting |
| `recall_memory` tool pattern | LLM decides when/what to search via PydanticAI tool registration |
| Graceful degradation | Hybrid → text-only fallback when inference model unavailable |

### Differentiation from Existing Elastic Blogs

| Existing Blog | Author(s) | Date | What They Cover | What Blog 1 Adds |
|--------------|-----------|------|-----------------|------------------|
| [AI agent memory: Creating smart agents with Elasticsearch managed memory](https://www.elastic.co/search-labs/blog/ai-agent-memory-management-elasticsearch) | Llermaly, Rengifo | Mar 18, 2026 | 3 memory types (procedural/episodic/semantic), document-level security, OpenAI Response API, Severance-themed demo | 4th type (state memory for resumable workflows), production-grade hybrid search with post-RRF reranking (time-decay + importance scoring), `recall_memory` tool where LLM controls its own retrieval |
| [Elasticsearch hybrid search](https://www.elastic.co/search-labs/blog/hybrid-search-elasticsearch) | Crettaz | Feb 17, 2025 | General hybrid search tutorial: RRF vs CC, dense/sparse models, query syntax, optimizations | Applies RRF to a specific production use case (agent memory) with domain-specific scoring layers on top |
| [How to defend your RAG system from context poisoning](https://www.elastic.co/search-labs/blog/context-poisoning-llm) | Murúa | Feb 10, 2026 | Defense patterns at RAG retrieval layer: temporal filtering, metadata boosting, semantic noise reduction | Implements solutions for temporal degradation and semantic noise inside agent memory (not a RAG knowledge base) |

### Source Material

All code excerpts originate from `building-agent-framework-part-1.md`:

| Code Block | Section in Part 1 | Lines (approx) |
|-----------|-------------------|-----------------|
| Quad-core Mermaid diagram | "The Quad-Core Memory Model" | flowchart with Agent → EM/SM/PM/ST |
| Episodic memory document schema | "Episodic Memory" description | `document = { "@timestamp": now, ... }` |
| `MemoryManager` class | "The MemoryManager" section | `retrieve_episodic` and `retrieve_semantic` |
| `_search_memory_index` RRF query | "Hybrid Search: RRF with Match + Semantic Queries" | Full RRF retriever body |
| Hybrid search Mermaid diagram | Same section | flowchart Q → STD/SEM → RRF → Reranking |
| Inference endpoint config | Below RRF section | `TEXT_EMBEDDING`, `SPARSE_EMBEDDING`, `RERANK` |
| `recall_memory` tool | "The recall_memory Tool" | PydanticAI `@agent.tool` registration |

### Cross-References to Include

- **Internal:** `/blog/building-agent-framework-part-1/` (source framework series)
- **Search Labs:** AI agent memory blog, Elasticsearch hybrid search, Context poisoning blog
- **Docs:** `semantic_text` field reference, RRF retriever reference

---

## Blog 2: Data Streams and ILM for AI Agent Lifecycles

### Pitch (one paragraph)

A practical guide to managing the operational data AI agents produce — conversation history, usage metrics, and execution state — using Elasticsearch data streams, ILM, and aggregations. Shows how to implement automatic retention, cost attribution via ES aggregations, and fire-and-forget async indexing. This is a completely novel angle for Search Labs — no existing blog covers data streams or ILM for agent data.

### Elasticsearch Features Covered

| Feature | How It's Used |
|---------|--------------|
| Data streams | `agent-episodic-memory` and `agent-usage-metrics` streams for append-only, time-stamped agent data |
| `@timestamp` field | Time-series indexing for conversation turns and usage metrics |
| ILM policies | hot (7d rollover) → warm (30d, shrink/forcemerge) → cold (60d) → delete (90d) |
| Index templates | Tie ILM policy to data stream index pattern automatically |
| ES aggregations | Token consumption by model, latency percentiles by agent, error rates, tool call frequency |
| Kibana dashboards | Time-series visualization of agent metrics via standard date_histogram + terms aggs |
| Fire-and-forget indexing | `asyncio.create_task` for non-blocking metrics persistence |
| `ElasticsearchStatePersistence` | Regular index (not data stream) for overwritable graph state by execution ID |

### Differentiation from Existing Elastic Blogs

**This is entirely novel.** No existing Search Labs blog covers:
- Data streams for agent conversation data
- ILM for agent data lifecycle management
- ES aggregations for LLM cost attribution
- The bridge between "Agentic AI" category and operational Elasticsearch

The closest related content is on Observability Labs (general concept alignment with data lifecycle management), but nothing targets agent-specific operational data.

### Source Material

Code excerpts come from two source posts:

| Code Block | Source File | Section |
|-----------|------------|---------|
| Episodic memory document schema | `building-agent-framework-part-1.md` | "Episodic Memory" |
| `write_usage` method + metrics document | `building-agent-framework-part-3.md` | "Usage Metrics" |
| Fire-and-forget `asyncio.create_task` | `building-agent-framework-part-3.md` | "Usage Metrics" |
| `ElasticsearchStatePersistence` | `building-agent-framework-part-1.md` | "State Memory" |
| ILM policy JSON | **New for this blog** — illustrative config, not in source posts |
| Index template JSON | **New for this blog** — illustrative config |
| Aggregation queries (3 examples) | **New for this blog** — token spend, latency percentiles, error rate |

### Cross-References to Include

- **Internal:** `/blog/building-agent-framework-part-1/`, `/blog/elasticsearch-production-agent-memory/`
- **Docs:** Data streams, ILM, Elasticsearch aggregations

---

## Blog 3: Context Engineering for Production Agents with Elasticsearch

### Pitch (one paragraph)

How Elasticsearch's inference API and search capabilities enable production context engineering — summarization for budget management, temporal decay for freshness, and graceful degradation at every layer. The context budget processor (keep system prompts + last N turns + summarize middle) is a novel pattern not covered anywhere on Search Labs.

### Elasticsearch Features Covered

| Feature | How It's Used |
|---------|--------------|
| Inference API (completion) | `summarize_text()` — Gemini Flash via ES inference endpoint for history summarization |
| `semantic_text` automatic chunking | Handles long documents (tool returns, agent responses) without external chunking pipeline |
| Temporal decay scoring | Client-side exponential decay on `@timestamp` with 24h half-life |
| `importance_score` metadata boosting | Secondary signal in reranking that survives time decay |
| Inference endpoint config | `.jina-embeddings-v3` (dense), `.elser-2-elastic` (sparse), `.jina-reranker-v3` (future) |
| Graceful degradation chain | hybrid → text → empty (search); inference → truncation (summarization) |

### Differentiation from Existing Elastic Blogs

| Existing Blog | Author(s) | Date | What They Cover | What Blog 3 Adds |
|--------------|-----------|------|-----------------|------------------|
| [How to defend your RAG system from context poisoning](https://www.elastic.co/search-labs/blog/context-poisoning-llm) | Murúa | Feb 10, 2026 | Defense patterns at RAG retrieval layer: temporal filtering, metadata boosting, conflict resolution | Inside-the-agent context engineering: budget management (summarize middle history), PII redaction before model calls, time-bounded retrieval for the agent's own memory (not a RAG knowledge base) |
| [Build task-aware agents with EIS](https://www.elastic.co/search-labs/blog/build-ai-agents-elastic-inference-service) | Handley et al. | Mar 6, 2026 | EIS model catalog, managed infrastructure for agent builders | End-to-end inference endpoint usage in a production agent: embeddings at index time, summarization at runtime, reranking at retrieval time |

**Novel contribution:** The three-zone context budget processor (system prompts + summary + last N turns) is not covered in any Search Labs post. This is the most distinctive pattern in the blog.

### Source Material

Code excerpts come from two source posts:

| Code Block | Source File | Section |
|-----------|------------|---------|
| `context_budget_processor` (full) | `building-agent-framework-part-3.md` | "Managing the Context Budget" |
| `summarize_text()` method | **New for this blog** — expanded from Part 3's reference to `ctx.deps.memory.summarize_text()` |
| `_score_memory()` function | **New for this blog** — concrete implementation of the reranking described in Part 1 |
| Inference endpoint env vars | `building-agent-framework-part-1.md` | Below "Hybrid Search" section |
| Graceful degradation Mermaid diagram | **New for this blog** — visualizes the fallback chain |
| `semantic_text` chunking description | Derived from Part 1's `semantic_text` explanation |

### Cross-References to Include

- **Internal:** `/blog/building-agent-framework-part-1/`
- **Search Labs:** Context poisoning blog, Build task-aware agents with EIS
- **Docs:** Inference API, `semantic_text`, inference endpoints

---

## Feature Coverage Matrix

This matrix confirms no ES feature is dropped across the three blogs:

| Elasticsearch Feature | Blog 1 (Memory) | Blog 2 (Data Streams) | Blog 3 (Context Eng.) |
|----------------------|:---:|:---:|:---:|
| `semantic_text` field type | ✅ Primary | — | ✅ Chunking focus |
| Inference endpoints (Jina v3, ELSER v2) | ✅ Config | — | ✅ Full lifecycle |
| RRF retriever (hybrid search) | ✅ Primary | — | ✅ Referenced |
| `rank_constant` tuning + oversampling | ✅ | — | — |
| Client-side reranking (time-decay + importance) | ✅ | — | ✅ Detailed scoring function |
| `recall_memory` tool pattern | ✅ | — | — |
| Data streams | Mentioned | ✅ Primary | — |
| ILM policies (hot/warm/cold/delete) | Mentioned | ✅ Primary | — |
| `@timestamp` time-series indexing | Used | ✅ Primary | ✅ For temporal decay |
| ES aggregations (analytics) | — | ✅ Primary | — |
| Kibana dashboards | — | ✅ | — |
| Fire-and-forget async indexing | — | ✅ | — |
| `ElasticsearchStatePersistence` | Mentioned | ✅ Detailed | — |
| Inference API (completion/summarization) | — | — | ✅ Primary |
| Context budget processor | — | — | ✅ Primary |
| Graceful degradation chain | ✅ Hybrid→text | ✅ Metrics non-blocking | ✅ Full chain diagram |

---

## Elastic Blog Landscape (Reference Blogs)

These are the existing Search Labs posts most relevant for positioning and cross-linking:

| Blog | URL | Published | Relevance |
|------|-----|-----------|-----------|
| AI agent memory | `elastic.co/search-labs/blog/ai-agent-memory-management-elasticsearch` | Mar 18, 2026 | Direct comparison for Blog 1 (memory types, doc-level security) |
| Elasticsearch hybrid search | `elastic.co/search-labs/blog/hybrid-search-elasticsearch` | Feb 17, 2025 | Foundation reference for RRF, CC, dense/sparse in Blogs 1 & 3 |
| Context poisoning defense | `elastic.co/search-labs/blog/context-poisoning-llm` | Feb 10, 2026 | Direct comparison for Blog 3 (temporal filtering, metadata boosting) |
| Build agents with EIS | `elastic.co/search-labs/blog/build-ai-agents-elastic-inference-service` | Mar 6, 2026 | Reference for Blog 3 (inference endpoint catalog) |
| Vector search recall (quantization) | `elastic.co/search-labs/blog/recall-vector-search-quantization` | Mar 20, 2026 | Background context on BBQ, HNSW accuracy |
| Gemini CLI extension for ES | `elastic.co/search-labs/blog/gemini-cli-extension-elasticsearch` | Mar 17, 2026 | Adjacent agentic AI content |
| Agent Skills for Elastic | `elastic.co/search-labs/blog/agent-skills-elastic` | Mar 16, 2026 | Adjacent agentic AI content |
| SearchClaw / OpenClaw | `elastic.co/search-labs/blog/openclaw-elasticsearch-ai-agents` | Mar 10, 2026 | Adjacent agentic AI content |

---

## Source Files in This Repository

| File | Role |
|------|------|
| `src/content/blog/building-agent-framework-part-1.md` | Primary source — quad-core memory, hybrid search, RRF, `semantic_text`, inference endpoints, `recall_memory` tool, SSE streaming |
| `src/content/blog/building-agent-framework-part-2.md` | MaaS architecture — **no ES features to extract**, excluded |
| `src/content/blog/building-agent-framework-part-3.md` | Secondary source — context budget processor, summarization via inference API, PII redaction, usage metrics data stream, structured logging, OpenTelemetry, graceful degradation |
| `src/content/blog/elasticsearch-ai-backbone-exec.md` | Exec-level "one engine" pitch — complementary, not duplicated by these posts |
| `src/content/blog/elasticsearch-production-agent-memory.md` | **Blog 1 draft** |
| `src/content/blog/elasticsearch-data-streams-agent-lifecycle.md` | **Blog 2 draft** |
| `src/content/blog/elasticsearch-context-engineering-agents.md` | **Blog 3 draft** |

---

## Editorial Notes

### Writing Style
All three posts match the existing blog series style: technical, code-heavy, direct prose, no filler. First-person sparingly. Mermaid diagrams for architecture. Python code blocks for implementation. JSON for Elasticsearch API calls.

### What's New vs. Extracted
Some content in the new blogs is **new** (not directly extracted from the source series):
- **Blog 2:** ILM policy JSON, index template JSON, all three aggregation query examples, `ElasticsearchStatePersistence` expanded implementation
- **Blog 3:** `summarize_text()` expanded implementation, `_score_memory()` concrete scoring function, graceful degradation Mermaid diagram

Everything else is adapted from the source posts with framing changes for the standalone context.

### Overlap Management
- Blogs 1 and 3 both reference RRF hybrid search. Blog 1 goes deep on the query structure. Blog 3 references it briefly and focuses on the post-search context engineering.
- Blogs 1 and 2 both mention data streams. Blog 1 mentions it as a storage detail. Blog 2 goes deep on configuration, ILM, and lifecycle.
- The exec blog (`elasticsearch-ai-backbone-exec.md`) covers similar themes to Blog 1 at a strategic level. Blog 1 is implementation-focused. They are complementary.
