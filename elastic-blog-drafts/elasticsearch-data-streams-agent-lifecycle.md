---
title: "Data Streams and ILM for AI Agent Lifecycles"
description: "A practical guide to managing the operational data AI agents produce — conversation history, usage metrics, and execution state — using Elasticsearch data streams, ILM, and aggregations."
date: 2026-03-21
tags:
  - elasticsearch
  - agents
  - data-streams
  - observability
  - python
draft: true
---

AI agents produce a lot of operational data. Every conversation turn, every tool call, every token count, every execution checkpoint — it all needs to go somewhere. Most teams reach for a grab bag: Redis for sessions, Postgres for metrics, a logging pipeline for telemetry. That is three systems to operate for data that shares a common lifecycle: it is hot for hours, warm for weeks, and irrelevant after a few months.

Elasticsearch data streams and index lifecycle management (ILM) solve this cleanly. This post walks through how [AgentEngine](/blog/building-agent-framework-part-1/) uses data streams for episodic memory and usage metrics, ILM for automatic retention, and aggregations for cost attribution — all without a single cron job or manual cleanup script.

## The Data Agents Produce

AgentEngine generates three categories of operational data:

1. **Conversation history** — Every user message, agent response, and tool interaction, scoped to a session. This is episodic memory (see [the memory architecture post](/blog/elasticsearch-production-agent-memory/) for how it is queried).

2. **Usage metrics** — Per-execution telemetry: which model ran, token counts (including cache hits), tool call counts, latency, success/failure status. This is the data you need for cost attribution and performance monitoring.

3. **Execution state** — Serialized graph snapshots from PydanticAI's graph API. When the agent hits a checkpoint, the full state persists — enabling resumable workflows across disconnections.

All three share a pattern: they are append-only, time-stamped, and have a natural expiration. Data streams are the right abstraction.

## Data Streams for Episodic Memory

Episodic memory uses the `agent-episodic-memory` data stream. Every conversation turn gets indexed with `@timestamp`:

```python
document = {
    "@timestamp": now,
    "memory_id": str(uuid4()),
    "agent_id": agent_id,
    "session_id": session_id,
    "role": role,
    "content": content,
    "importance_score": 0.2,
    "source_type": source_type,
    "context_tags": {},
    "causal_links": [],
}

await self._client.index(
    index="agent-episodic-memory",
    document=document,
)
```

Data streams handle the underlying index management automatically. New backing indices are created on rollover (triggered by size or age), and the stream name acts as a stable alias for both writes and reads. You never worry about index naming, shard sizing, or write routing — the data stream handles it.

### Why Data Streams Over Regular Indices

For agent conversation data, data streams provide three key benefits:

**Append-only semantics.** Conversation turns are never updated in place — they are immutable records. Data streams enforce this: you can index new documents, but you cannot update or delete individual records by ID. This matches the episodic memory access pattern perfectly.

**Automatic backing index management.** As the data stream grows, Elasticsearch manages the underlying indices. Rollover happens automatically based on configured thresholds (size, age, document count). You write to the stream; Elasticsearch handles where the documents land.

**ILM integration.** Data streams work seamlessly with index lifecycle management policies, which is where the real operational value comes in.

## ILM for Automatic Retention

Agent data follows a predictable lifecycle. Conversation history from today is critical. Last week's history is useful for context. Three-month-old history is rarely accessed and can be compressed or deleted.

ILM codifies this lifecycle as a policy:

```json
PUT _ilm/policy/agent-memory-policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "7d"
          },
          "set_priority": {
            "priority": 100
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          },
          "set_priority": {
            "priority": 50
          }
        }
      },
      "cold": {
        "min_age": "60d",
        "actions": {
          "set_priority": {
            "priority": 0
          }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

The phases:

- **Hot (0-7 days):** Active writes, full indexing speed, rollover at 50 GB or 7 days. Recent conversation turns live here. Highest priority for shard allocation.
- **Warm (30 days):** Read-only. Shrink to one shard, force-merge to one segment. Reduces storage footprint without losing data.
- **Cold (60 days):** Lower priority allocation. Data is still queryable but moves to cheaper storage.
- **Delete (90 days):** Automatic deletion. No manual cleanup, no forgotten cron jobs.

The data stream template ties the policy to the index pattern:

```json
PUT _index_template/agent-episodic-memory-template
{
  "index_patterns": ["agent-episodic-memory"],
  "data_stream": {},
  "template": {
    "settings": {
      "index.lifecycle.name": "agent-memory-policy",
      "number_of_shards": 1,
      "number_of_replicas": 1
    }
  }
}
```

Once configured, every backing index created by the `agent-episodic-memory` data stream inherits this lifecycle automatically. No per-index configuration. No drift.

## Usage Metrics: Cost Attribution with Aggregations

Every agent execution writes a usage document to the `agent-usage-metrics` data stream:

```python
async def write_usage(
    self, *, agent_id, session_id, model, mcp_tools, mcp_resources,
    input_tokens, output_tokens, total_tokens,
    cache_read_tokens, cache_write_tokens,
    requests, tool_calls, latency_ms, context_window_size,
    status, error_message=None, wait=False,
) -> None:
    document = {
        "@timestamp": now,
        "metric_id": str(uuid4()),
        "agent_id": agent_id,
        "session_id": session_id,
        "model": model,
        "mcp_tools": mcp_tools,
        "mcp_resources": mcp_resources,
        "input_tokens": int(input_tokens),
        "output_tokens": int(output_tokens),
        "total_tokens": int(total_tokens),
        "cache_read_tokens": int(cache_read_tokens),
        "cache_write_tokens": int(cache_write_tokens),
        "requests": int(requests),
        "tool_calls": int(tool_calls),
        "latency_ms": float(latency_ms),
        "context_window_size": int(context_window_size),
        "status": status,
        "error_message": error_message,
    }
    _ = asyncio.create_task(
        self._index_document(settings.memory_usage_index, document)
    )
```

Two details matter here:

**Fire-and-forget indexing.** The `asyncio.create_task` call sends the document to Elasticsearch without waiting for the response. Agent responses should never block on metrics persistence. If indexing fails, it fails silently in a background task. This is the same graceful degradation pattern the framework applies everywhere: optional subsystems never block core execution.

**Cache token tracking.** The document captures both `cache_read_tokens` and `cache_write_tokens`. With prompt caching enabled on models like Claude or GPT-4, cache hits dramatically reduce cost. Tracking cache rates per agent and per model helps optimize prompt structure for caching efficiency.

### Aggregation Queries for Dashboards

Because usage documents land with `@timestamp`, they slot into standard Kibana dashboards. Here are the aggregation patterns that matter most:

**Token consumption by model (daily):**

```json
POST agent-usage-metrics/_search
{
  "size": 0,
  "query": {
    "range": {
      "@timestamp": { "gte": "now-7d" }
    }
  },
  "aggs": {
    "by_model": {
      "terms": { "field": "model" },
      "aggs": {
        "daily_tokens": {
          "date_histogram": {
            "field": "@timestamp",
            "calendar_interval": "day"
          },
          "aggs": {
            "total": { "sum": { "field": "total_tokens" } },
            "cache_hits": { "sum": { "field": "cache_read_tokens" } }
          }
        }
      }
    }
  }
}
```

**Latency percentiles by agent:**

```json
POST agent-usage-metrics/_search
{
  "size": 0,
  "query": {
    "range": {
      "@timestamp": { "gte": "now-24h" }
    }
  },
  "aggs": {
    "by_agent": {
      "terms": { "field": "agent_id" },
      "aggs": {
        "latency_pct": {
          "percentiles": {
            "field": "latency_ms",
            "percents": [50, 90, 95, 99]
          }
        }
      }
    }
  }
}
```

**Error rate and tool call frequency:**

```json
POST agent-usage-metrics/_search
{
  "size": 0,
  "query": {
    "range": {
      "@timestamp": { "gte": "now-7d" }
    }
  },
  "aggs": {
    "error_rate": {
      "terms": { "field": "status" }
    },
    "tool_usage": {
      "terms": { "field": "mcp_tools", "size": 20 },
      "aggs": {
        "avg_latency": { "avg": { "field": "latency_ms" } }
      }
    }
  }
}
```

These are standard Elasticsearch aggregations — nothing agent-specific about the query language. The value is in the document schema: by capturing model, agent_id, tools, tokens, latency, and status in every usage document, you can answer any operational question with a single aggregation query.

## State Persistence for Resumable Workflows

State memory differs from the other data types. It is not append-only — graph state is overwritten at each checkpoint. And it is not time-series — you look up state by execution ID, not by timestamp.

For this reason, state memory uses a regular Elasticsearch index (`agent-state`) rather than a data stream. The `ElasticsearchStatePersistence` class implements PydanticAI's state persistence interface:

```python
class ElasticsearchStatePersistence:
    """Persist PydanticAI graph state to Elasticsearch."""

    async def save_state(self, execution_id: str, state: dict) -> None:
        await self._client.index(
            index="agent-state",
            id=execution_id,
            document={
                "@timestamp": datetime.utcnow().isoformat(),
                "execution_id": execution_id,
                "state": state,
            },
        )

    async def load_state(self, execution_id: str) -> dict | None:
        try:
            result = await self._client.get(index="agent-state", id=execution_id)
            return result["_source"]["state"]
        except NotFoundError:
            return None
```

The access pattern is simple: save by execution ID, load by execution ID. But having state in Elasticsearch means it benefits from the same cluster management, monitoring, and backup procedures as the rest of the agent's data. One system to operate.

State documents get their own ILM policy with a shorter delete phase — completed workflow states are typically irrelevant after a few days.

## The Operational Payoff

Without data streams and ILM, managing agent data requires:

- Cron jobs to delete old conversation history
- Manual index rotation scripts
- Separate metrics databases with their own retention logic
- A state backend (Redis, Postgres, DynamoDB) with its own cleanup

With data streams and ILM:

- Retention is declarative and automatic
- Rollover happens without intervention
- Hot/warm/cold tiering optimizes cost naturally
- One aggregation language covers all analytics

The agents themselves never think about data lifecycle. They write documents with `@timestamp`. Elasticsearch handles everything else.

For the full framework architecture and how this memory system integrates with hybrid search retrieval, see the [agent framework series](/blog/building-agent-framework-part-1/). For more on Elasticsearch data streams and ILM, the [official documentation](https://www.elastic.co/docs/manage-data/data-store/data-streams) covers configuration options beyond what is shown here.
