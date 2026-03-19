---
title: "Building an Agent Framework: Production Patterns"
description: "Part 3 of the series — privacy-preserving history processors, context budget management, structured logging, OpenTelemetry tracing, and usage metrics."
date: 2026-03-18
tags:
  - agents
  - observability
  - opentelemetry
  - python
  - production
series: "agent-framework"
seriesPart: 3
draft: true
---

[Part 1](/blog/building-agent-framework-part-1/) covered the architecture and Elasticsearch-backed memory. [Part 2](/blog/building-agent-framework-part-2/) covered MaaS and tool aggregation. This final post covers the patterns that make the framework production-ready: privacy redaction, context budget management, structured logging, distributed tracing, and usage metrics.

None of these features make the agent smarter. They make it safe, observable, and cost-efficient — which matters more once the system handles real user data at scale.

## Privacy-Preserving History Processors

PydanticAI supports history processors — async functions that transform the conversation history before every model call. The framework chains two processors: one for privacy, one for context budget.

### Redacting PII

Every message in the conversation history passes through `privacy_history_processor` before the model sees it. The processor scans text content for patterns that look like PII and replaces them with `[REDACTED]`:

```python
_PII_PATTERNS = [
    re.compile(r"\b[\w\.-]+@[\w\.-]+\.[A-Za-z]{2,}\b"),  # Email addresses
    re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),                  # SSN format
    re.compile(r"\b(?:\d[ -]*?){13,19}\b"),                 # Credit card numbers
]

def _redact_text(text: str) -> str:
    if not text:
        return text
    redacted = text
    for pattern in _PII_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)
    return redacted
```

The processor itself walks every part of every message — user prompts, system prompts, text parts, and tool return values:

```python
async def privacy_history_processor(
    _ctx: RunContext[AgentDeps],
    history: list[ModelRequest | ModelResponse],
) -> list[ModelRequest | ModelResponse]:
    """Redact sensitive data in history before it reaches the model."""
    redacted_history: list[ModelRequest | ModelResponse] = []
    for message in history:
        new_parts: list[Any] = []
        for part in message.parts:
            if isinstance(part, (TextPart, UserPromptPart, SystemPromptPart)):
                new_parts.append(
                    _update_part_content(part, _redact_text(str(part.content)))
                )
            elif isinstance(part, ToolReturnPart) and isinstance(part.content, str):
                new_parts.append(
                    _update_part_content(part, _redact_text(part.content))
                )
            else:
                new_parts.append(part)
        redacted_history.append(_copy_message_with_parts(message, new_parts))
    return redacted_history
```

A few design points worth calling out:

**Immutable copies.** The processor never mutates the original message objects. `_update_part_content` uses Pydantic's `model_copy` (or `dataclasses.replace` as a fallback) to create new part instances. `_copy_message_with_parts` does the same for the message envelope. This means the original history is preserved for logging and debugging — only the model sees the redacted version.

**Tool returns are redacted too.** If a tool fetches data that happens to contain an email address or SSN, the redaction catches it before the model processes the result in subsequent turns. This is important because tool outputs are unpredictable — you cannot know ahead of time what external data will contain.

**It runs on every model call.** History processors fire before each `run_stream()` invocation, not just at the beginning of a conversation. As the conversation grows and includes more tool results, the redaction stays current.

### Managing the Context Budget

Long conversations accumulate history fast. Every user message, every model response, every tool call and return — they all stack up. Eventually the history exceeds the model's context window, or you start burning tokens on stale context that does not help the current task.

The `context_budget_processor` solves this with a three-part strategy: keep system prompts, keep recent turns, summarize the middle.

```python
HISTORY_TOKEN_BUDGET = 2000
HISTORY_KEEP_LAST = 10
HISTORY_SUMMARY_CHAR_LIMIT = 1200

async def context_budget_processor(
    ctx: RunContext[AgentDeps],
    history: list[ModelRequest | ModelResponse],
) -> list[ModelRequest | ModelResponse]:
    """Trim or summarize history to keep within the token budget."""
    if _history_token_count(history) <= HISTORY_TOKEN_BUDGET:
        return history  # Under budget, pass through unchanged

    last_start = max(len(history) - HISTORY_KEEP_LAST, 0)

    # Always keep system prompts and the last N turns
    system_indexes = [
        i for i, msg in enumerate(history)
        if _has_system_prompt(msg) and i < last_start
    ]
    keep_indexes = set(system_indexes + list(range(last_start, len(history))))

    # Everything else gets summarized
    middle_messages = [
        msg for i, msg in enumerate(history) if i not in keep_indexes
    ]
    if not middle_messages:
        return [history[i] for i in sorted(keep_indexes)]

    # Summarize via Elasticsearch inference or truncate as fallback
    middle_text = "\n".join(_message_text(msg) for msg in middle_messages)
    summary = None
    if ctx.deps.memory:
        summary = await ctx.deps.memory.summarize_text(middle_text)
    if not summary:
        summary = middle_text[:HISTORY_SUMMARY_CHAR_LIMIT]

    summary_part = SystemPromptPart(
        content=f"Summary of earlier context: {summary}"
    )
    summary_message = ModelRequest(parts=[summary_part])

    # Reconstruct: system prompts → summary → last N turns
    new_history: list[ModelRequest | ModelResponse] = []
    for index, message in enumerate(history):
        if index in system_indexes:
            new_history.append(message)
        if index == last_start:
            new_history.append(summary_message)
        if index >= last_start:
            new_history.append(message)
    return new_history
```

The logic breaks history into three zones:

1. **System prompts** — Always preserved, regardless of position. These contain the agent's instructions and cannot be lost.
2. **Last 10 turns** — The most recent conversation context. These are the messages most likely to be relevant to the current task.
3. **Middle zone** — Everything between system prompts and the last 10 turns. This gets collapsed into a single summary message.

The summarization path is interesting. When Elasticsearch memory is available, the processor calls `summarize_text()`, which uses a configured completion model (Gemini Flash via Elasticsearch's inference API) to produce a concise summary. When memory is not available, it falls back to simple character truncation. Either way, the middle zone collapses to a fraction of its original size.

The result is a token-bounded history that preserves the agent's instructions, keeps recent context fresh, and retains a compressed version of older interactions — all without the model needing to know any of this happened.

## Structured Logging

Every log entry in the framework is structured JSON, written to stdout for consumption by container orchestrators and log aggregation systems.

The logging configuration uses structlog with context variables for cross-request correlation:

```python
def configure_logging() -> structlog.BoundLogger:
    shared_processors = [
        structlog.contextvars.merge_contextvars,  # Inject request context
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
        _add_service_context,                     # Service name + version
    ]

    if settings.log_format == "console":
        processors = [*shared_processors, structlog.dev.ConsoleRenderer(colors=True)]
    else:
        processors = [
            *shared_processors,
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )
```

Two format modes: `json` for production (machine-parseable, Elasticsearch-ready) and `console` for local development (colored, human-readable). Same processors, different renderers.

### Log Sanitization

Log entries go through their own sanitization layer, separate from the PII redaction in history processors. This catches sensitive values that appear in tool arguments, API responses, and configuration:

```python
_REDACT_PATTERN = re.compile(
    r"(password|secret|token|api_key|authorization|bearer|credential)",
    re.IGNORECASE,
)

MAX_ARG_LENGTH = 500
MAX_RESPONSE_LENGTH = 1000

def sanitize_for_logging(value: Any, max_length: int = MAX_ARG_LENGTH) -> Any:
    if isinstance(value, str):
        redacted = "[REDACTED]" if _REDACT_PATTERN.search(value) else value
        if len(redacted) > max_length:
            return redacted[:max_length - 3] + "..."
        return redacted
    elif isinstance(value, dict):
        return {
            k: "[REDACTED]" if _REDACT_PATTERN.search(str(k))
            else sanitize_for_logging(v, max_length)
            for k, v in value.items()
        }
    elif isinstance(value, (list, tuple)):
        return [sanitize_for_logging(item, max_length) for item in value[:20]]
    return value
```

This is recursive — dictionaries have their keys checked against the redaction pattern, and nested structures are walked. Tool arguments get truncated at 500 characters, tool responses at 1000. These limits prevent a single verbose tool return from bloating log storage.

The sanitization functions (`sanitize_tool_args`, `sanitize_response`) are used throughout the SSE streaming layer from Part 1 — every `tool_call` and `tool_return` event passes through them before reaching the client or the logs.

## OpenTelemetry & Request Tracing

The framework uses OpenTelemetry for distributed tracing with automatic FastAPI instrumentation:

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

resource = Resource.create({"service.name": settings.otel_service_name})
provider = TracerProvider(resource=resource)

if settings.otel_exporter_otlp_endpoint:
    exporter = OTLPSpanExporter(endpoint=settings.otel_exporter_otlp_endpoint)
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)

trace.set_tracer_provider(provider)
FastAPIInstrumentor.instrument_app(app)
```

`FastAPIInstrumentor` wraps every HTTP handler with a span, capturing method, path, status code, and latency automatically. The OTLP exporter is only configured when a backend endpoint is set — in development, tracing is a no-op.

### Request Correlation Middleware

A custom middleware bridges OpenTelemetry traces with structlog context:

```python
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    start_time = time.time()

    bind_contextvars(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
    )

    logger.info("request_started", category="http_request", phase="start")

    try:
        response = await call_next(request)
        latency_ms = (time.time() - start_time) * 1000
        logger.info(
            "request_completed",
            category="http_request",
            phase="end",
            status_code=response.status_code,
            latency_ms=round(latency_ms, 2),
        )
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as exc:
        latency_ms = (time.time() - start_time) * 1000
        logger.error(
            "request_failed",
            category="http_request",
            phase="error",
            error=str(exc),
            latency_ms=round(latency_ms, 2),
        )
        raise
    finally:
        clear_contextvars()
```

`bind_contextvars` from structlog injects `request_id`, `method`, and `path` into every log entry emitted during the request — including logs from deep in the memory layer or MCP client. When the request completes, `clear_contextvars` cleans up. The `X-Request-ID` header is propagated back to the client, so frontend logs can be correlated with backend traces.

This means a single agent execution — which might involve memory queries, multiple MCP tool calls, and streaming responses — produces a coherent log trail tied to one request ID.

## Usage Metrics

Every agent execution writes a usage document to Elasticsearch's `agent-usage-metrics` data stream:

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
    # Fire-and-forget indexing to avoid blocking the response
    _ = asyncio.create_task(
        self._index_document(settings.memory_usage_index, document)
    )
```

This captures everything needed for cost attribution and performance analysis: which model ran, how many tokens were consumed (including cache hits), which tools were invoked, total latency, and whether the execution succeeded or failed.

The `wait` parameter controls whether indexing is synchronous (for tests) or fire-and-forget (in production). Agent responses should never block on metrics persistence.

Because usage documents land in Elasticsearch with `@timestamp`, they slot into standard Kibana dashboards for time-series analysis. You can query token consumption per model, average latency per agent, tool call frequency, error rates — all with standard Elasticsearch aggregations. This data stream shares the same ILM policy as the memory indices, so old metrics age out automatically.

## Graceful Degradation

A recurring pattern across the framework: **optional subsystems never block core execution**.

- If Elasticsearch is unreachable, memory operations log a warning and return empty results. The agent executes without memory context.
- If the hybrid search query fails (inference model not deployed), it falls back to a plain `match` query for text search.
- If summarization fails in the context budget processor, it falls back to character truncation.
- If the OTLP endpoint is not configured, tracing becomes a no-op.
- If usage metric indexing fails, it fails silently in a background task.

This is a deliberate design choice. An agent that cannot answer because the metrics backend is down is worse than an agent that answers without recording metrics. Each subsystem degrades independently, and the core request-response path has the fewest hard dependencies possible.

## Series Wrap-Up

Across three posts, this series covered:

- **Part 1** — Architecture overview, Elasticsearch-backed quad-core memory (episodic, semantic, procedural, state), hybrid search with RRF and reranking, streaming SSE
- **Part 2** — MaaS (MCP as a Service), FastMCP proxy aggregation, role-based tool filtering with transforms, helper tools bridging MCP primitives
- **Part 3** — Privacy redaction, context budget management, structured logging, OpenTelemetry tracing, usage metrics, graceful degradation

The framework is built on a few core convictions: agents need memory beyond the context window, tool access should be centralized and access-controlled, every execution should be observable, and production systems must degrade gracefully. PydanticAI, FastMCP, and Elasticsearch each handle their part cleanly — the value is in how they compose.
