---
title: "Building AI Agent Memory on Elasticsearch: A Deep Dive"
description: "Detailed implementation guide for using Elasticsearch as the unified memory backend for agentic AI — hybrid search with RRF, semantic_text fields, data streams, ILM, and state persistence."
date: 2026-03-18
tags:
  - elasticsearch
  - ai
  - agents
  - python
  - architecture
draft: true
---

Vector databases are the default answer when someone asks "where do I store embeddings for my AI system?" But if you're building anything beyond a basic RAG pipeline — agents with persistent memory, resumable workflows, tool usage tracking — you'll quickly outgrow a single-purpose vector store and start bolting on additional systems.

Our team built AgentEngine — an API-driven agent framework that uses Elasticsearch as the sole backend for all memory, retrieval, and state management. No Redis for sessions. No Pinecone for vectors. No Postgres for structured data. One engine handles everything. This post covers the implementation in detail.

## Index Architecture: Four Memory Types

The framework organizes agent memory into four Elasticsearch indices, each with a distinct purpose and access pattern.

```
agent-episodic-memory    → Data stream, ILM-managed, session-scoped conversation turns
agent-semantic-memory    → Standard index, importance-scored long-term knowledge
agent-procedural-memory  → Standard index, tool usage patterns and outcomes
agent-state              → Standard index, serialized graph execution checkpoints
```

### Episodic Memory Index

Episodic memory stores conversation turns. It uses a data stream because the access pattern is append-only and time-ordered — exactly what data streams optimize for.

The mapping uses `semantic_text` for the content field, which is the key to hybrid search working on a single field:

```json
{
  "mappings": {
    "properties": {
      "memory_id": { "type": "keyword" },
      "agent_id": { "type": "keyword" },
      "session_id": { "type": "keyword" },
      "role": { "type": "keyword" },
      "content": {
        "type": "semantic_text",
        "inference_id": ".jina-embeddings-v3"
      },
      "importance_score": { "type": "float" },
      "source_type": { "type": "keyword" },
      "context_tags": { "type": "object", "dynamic": true },
      "causal_links": { "type": "keyword" }
    }
  }
}
```

The `semantic_text` field does something critical at ingest: it automatically chunks the text and generates both dense embeddings (via the configured inference endpoint) and sparse embeddings (via ELSER-2). You write a plain text string. Elasticsearch produces the vectors. No external embedding pipeline. No batch jobs.

The ILM policy handles lifecycle automatically:

```json
{
  "policy": {
    "phases": {
      "hot": { "actions": { "rollover": { "max_age": "7d", "max_size": "10gb" } } },
      "warm": { "min_age": "30d", "actions": { "shrink": { "number_of_shards": 1 } } },
      "delete": { "min_age": "90d", "actions": { "delete": {} } }
    }
  }
}
```

Recent conversations live on fast storage. After 30 days they compress to a single shard. After 90 days they're deleted. No cron jobs, no manual cleanup.

### Document Indexing

Every conversation turn gets indexed with full metadata:

```python
document = {
    "@timestamp": datetime.now(UTC).isoformat(),
    "memory_id": str(uuid4()),
    "agent_id": agent_id,
    "session_id": session_id,
    "role": role,                    # "user" | "assistant"
    "content": content,              # Raw text → auto-embedded by semantic_text
    "importance_score": 0.2,         # Default, adjustable
    "source_type": source_type,      # "user_message", "agent_response", "tool_result"
    "context_tags": tags or {},
    "causal_links": links or [],
}
await self._client.index(index="agent-episodic-memory", document=document)
```

The `content` field is plain text. Elasticsearch handles chunking, embedding, and indexing the vectors automatically. This is the part that eliminates the external embedding pipeline — `semantic_text` does it inline at ingest.

## Hybrid Search with Reciprocal Rank Fusion

This is where it gets interesting. Episodic and semantic memory both support two retrieval modes: chronological (recent turns) and relevance-ranked (hybrid search). The hybrid search implementation uses Elasticsearch's RRF retriever to merge BM25 and dense vector results.

### The Query

```python
async def _search_memory_index(
    self,
    *,
    index: str,
    agent_id: str,
    search_query: str,
    top_k: int = 10,
    session_id: str | None = None,
) -> list[dict]:
    filters = [{"term": {"agent_id": agent_id}}]
    if session_id:
        filters.append({"term": {"session_id": session_id}})

    body = {
        "size": max(top_k * 3, 10),
        "retriever": {
            "rrf": {
                "rank_constant": 60,
                "retrievers": [
                    {
                        "standard": {
                            "query": {
                                "bool": {
                                    "filter": filters,
                                    "must": [{"match": {"content": search_query}}],
                                }
                            }
                        }
                    },
                    {
                        "standard": {
                            "query": {
                                "bool": {
                                    "filter": filters,
                                    "must": [
                                        {
                                            "semantic": {
                                                "field": "content",
                                                "query": search_query,
                                            }
                                        }
                                    ],
                                }
                            }
                        }
                    },
                ],
            }
        },
    }
    resp = await self._client.search(index=index, body=body)
    return [hit["_source"] for hit in resp["hits"]["hits"]]
```

### What's Happening

Two retrievers fire in parallel against the same index:

1. **BM25 retriever** — a standard `match` query on the `content` field. Classic full-text search. Catches exact terms, error codes, specific tool names — anything where lexical matching matters.

2. **Semantic retriever** — a `semantic` query on the same `content` field. This hits the dense vector embeddings generated by `semantic_text` at ingest. Catches meaning and intent even when the words don't match.

**Reciprocal Rank Fusion** merges both result sets. Unlike score-based fusion, RRF uses rank positions:

$$RRF(d) = \sum_{r \in retrievers} \frac{1}{k + rank_r(d)}$$

Where $k$ is the `rank_constant` (60 in our config). A document that ranks high in both retrieval lists gets a combined score that reflects its relevance across both methods. This avoids the normalization problem — BM25 scores and vector similarity scores aren't on the same scale, so you can't just add them.

The query oversamples by 3x (`top_k * 3`) to give the reranker a larger candidate pool. A final reranking pass with Jina Reranker v3 re-scores the candidates for precision.

### Fallback: When Hybrid Fails

If the inference endpoint is down or the index doesn't have embeddings, the system falls back to BM25-only:

```python
async def retrieve_episodic(self, *, agent_id, session_id=None,
                            search_query=None, top_k=10) -> list[str]:
    if search_query and search_query.strip():
        try:
            hits = await self._search_memory_index(
                index=settings.memory_episodic_index,
                agent_id=agent_id,
                search_query=search_query,
                top_k=top_k,
                session_id=session_id,
            )
        except Exception:
            hits = await self._bm25_fallback(...)
    else:
        hits = await self._recent_memory_index(
            index=settings.memory_episodic_index,
            agent_id=agent_id,
            session_id=session_id,
            top_k=top_k,
        )
    return _format_conversation_lines(hits)
```

Memory should never block agent execution. If hybrid search fails, BM25 still returns useful results. If all search fails, the agent runs without memory context rather than crashing.

## Agent-Initiated Recall

The agent can actively search its own memory via a PydanticAI tool:

```python
@agent.tool
async def recall_memory(ctx_run: RunContext[AgentDeps], query: str) -> str:
    """Recall relevant memory snippets for the current agent session."""
    deps = ctx_run.deps
    if not deps.memory or not deps.agent_id:
        return "Memory is not available."
    results = await deps.memory.search_memory(
        agent_id=deps.agent_id,
        search_query=query,
        top_k=5,
    )
    if not results:
        return "No relevant memories found."
    return "\n".join(results)
```

This is registered dynamically when the agent has memory enabled. The model decides when to call it — rather than always stuffing the context window with potentially irrelevant history. This keeps token usage lower and retrieval more targeted.

## State Persistence for Resumable Workflows

Graph execution state serializes to Elasticsearch at each step boundary:

```python
class ElasticsearchStatePersistence:
    """Persist PydanticAI graph state to Elasticsearch."""

    def __init__(self, client: AsyncElasticsearch, index: str = "agent-state"):
        self._client = client
        self._index = index

    async def save(self, session_id: str, state: dict) -> None:
        await self._client.index(
            index=self._index,
            id=session_id,
            document={
                "@timestamp": datetime.now(UTC).isoformat(),
                "session_id": session_id,
                "state": state,
            },
        )

    async def load(self, session_id: str) -> dict | None:
        try:
            resp = await self._client.get(index=self._index, id=session_id)
            return resp["_source"]["state"]
        except NotFoundError:
            return None
```

The session ID is used as the document ID, so saves are idempotent — each checkpoint overwrites the previous one. When a user reconnects, the framework loads the last checkpoint and resumes the graph from that step.

This works because Elasticsearch is already in the dependency chain. No new connection, no new client, no new failure mode. State is just another document.

## Inference Endpoint Configuration

The three model endpoints that power hybrid search:

```
TEXT_EMBEDDING=.jina-embeddings-v3      # Dense embeddings for semantic_text
SPARSE_EMBEDDING=.elser-2-elastic       # Sparse embeddings (ELSER-2)
RERANK=.jina-reranker-v3               # Cross-encoder for reranking
```

These are configured as Elasticsearch inference endpoints. The `semantic_text` field references the text embedding endpoint by ID. ELSER-2 runs as a built-in sparse model. The reranker is invoked at query time.

All three run inside the Elasticsearch cluster — no external API calls for embedding generation. Ingest latency per document is typically under 50ms for the embedding step.

## Semantic Memory: Long-Term Knowledge

Semantic memory follows the same index and query patterns as episodic memory but serves a different purpose. It stores distilled facts and knowledge extracted from conversations over time.

Each entry carries an importance score that influences retrieval. A consolidation process periodically scans for related entries, merges them, and updates importance scores:

```python
async def consolidate_semantic_memory(self, agent_id: str) -> int:
    """Merge related semantic memories and update importance scores."""
    entries = await self._get_all_semantic(agent_id=agent_id)
    clusters = self._cluster_by_similarity(entries, threshold=0.85)
    merged_count = 0
    for cluster in clusters:
        if len(cluster) < 2:
            continue
        merged = self._merge_entries(cluster)
        await self._index_semantic(agent_id=agent_id, entry=merged)
        for old in cluster:
            await self._delete_semantic(memory_id=old["memory_id"])
        merged_count += len(cluster) - 1
    return merged_count
```

This keeps semantic memory from growing without bound while preserving the most useful knowledge.

## Procedural Memory: Learning from Tool Usage

Procedural memory tracks tool calls and their outcomes, giving the agent a feedback loop:

```json
{
  "task_signature": "generate_dbt_model_query",
  "tool_chain": ["query_dbt_model", "format_sql"],
  "outcome": "success",
  "latency_ms": 2340,
  "correction_notes": null,
  "timestamp": "2026-03-15T14:22:00Z"
}
```

When the agent encounters a similar task, it can query procedural memory for past approaches. If a tool chain failed before, the agent skips it. If a faster approach exists, it tries that first. The retrieval is a standard BM25 query on `task_signature` — no vector search needed here since the matching is on structured task names.

## Why Not a Separate Vector Database?

The practical answer: because I didn't need one, and each additional system in the stack is a liability.

The technical answer: Elasticsearch's `semantic_text` field type does inline embedding at ingest, hybrid retrieval with RRF merges BM25 + vector results in a single query, and data streams with ILM handle the lifecycle management that AI-scale data generation demands. A separate vector database would give me dense vector search — and nothing else. I'd still need Elasticsearch (or something like it) for full-text search, document storage, time-series patterns, and lifecycle management.

For agent memory specifically, the combination of chronological retrieval, hybrid relevance search, structured queries, and document storage in one engine eliminates an entire class of integration problems. The MemoryManager class talks to one client. One connection pool. One set of indices. That simplicity compounds as the system scales.

If your workload is pure vector search with no text, no time-series, no structured queries — a dedicated vector database makes sense. For agent memory, where every access pattern shows up, Elasticsearch covers the full surface area.
