---
title: "Building an Agent Framework: MaaS — MCP as a Service"
description: "Part 2 of the series — how FastMCP proxies aggregate multiple tool servers behind one endpoint with role-based access control and tool filtering."
date: 2026-03-18
tags:
  - agents
  - mcp
  - fastmcp
  - python
  - architecture
series: "agent-framework"
seriesPart: 2
draft: false
---

In [Part 1](/blog/building-agent-framework-part-1/) I covered the overall architecture of the agent framework and went deep on how Elasticsearch powers a quad-core memory system with hybrid search. This post focuses on the other half of the system: **MaaS — MCP as a Service**.

MaaS is a FastMCP proxy that sits between the agent and the external tool servers. It aggregates multiple MCP servers behind a single endpoint, tags tools with group metadata, and filters tool visibility based on user roles. The agent engine never talks to dbt, GitHub, or Atlan directly — it talks to MaaS, and MaaS handles the rest.

## The Problem MaaS Solves

Without MaaS, the agent engine would need to:

1. Maintain connections to every upstream MCP server individually
2. Handle authentication for each server (different tokens, different mechanisms)
3. Implement tool filtering and access control in the agent layer
4. Manage server health, retries, and failover per-connection

That is a lot of cross-cutting concern leaking into agent logic. MaaS pushes all of it into a dedicated service. The agent engine connects to one endpoint and gets a clean, pre-filtered list of tools, prompts, and resources.

## FastMCP Proxy Architecture

FastMCP's `create_proxy` function does the heavy lifting. You hand it a config dictionary describing upstream servers, and it returns an MCP server that transparently proxies tool calls, resources, and prompts from all of them:

```python
def _build_proxy_config() -> dict[str, dict[str, dict[str, Any]]]:
    servers = dict([
        _build_server_entry(
            "dbt",
            "MCP_DBT_URL",
            "MCP_DBT_TRANSPORT",
            headers=_build_dbt_headers(),
            default_transport="streamable-http",
        ),
        _build_server_entry(
            "github",
            "MCP_GITHUB_URL",
            "MCP_GITHUB_TRANSPORT",
            headers=_build_github_headers(),
        ),
        _build_server_entry(
            "atlan",
            "MCP_ATLAN_URL",
            "MCP_ATLAN_TRANSPORT",
            headers=_build_atlan_headers(),
        ),
    ])
    return {"mcpServers": servers}

mcp = create_proxy(
    _build_proxy_config(),
    name="MCP as a Service",
)
```

Each server entry packages a URL, transport type, and authentication headers. The `_build_server_entry` helper keeps this declarative:

```python
def _build_server_entry(
    prefix: str,
    url_env: str,
    transport_env: str,
    *,
    headers: dict[str, str] | None = None,
    default_transport: str = "http",
) -> tuple[str, dict[str, Any]]:
    url = _require_env(url_env)
    transport = os.getenv(transport_env, default_transport)
    config: dict[str, Any] = {"url": url, "transport": transport}
    if headers:
        config["headers"] = headers
    return prefix, config
```

Adding a new upstream server is a single function call in `_build_proxy_config`. The proxy handles connection lifecycle, tool namespacing (each tool gets prefixed by its server name — `dbt_list_models`, `github_create_pull_request`), and transparent forwarding of tool calls back to the originating server.

Authentication is isolated per server. dbt gets a service token. GitHub gets a PAT. Atlan gets an API key. None of these credentials touch the agent engine — they live in MaaS environment variables and get injected into request headers by the builder functions.

## Tool Filtering with Transforms

FastMCP exposes a `Transform` abstraction that intercepts and modifies the list of tools before it reaches the client. MaaS chains two transforms in sequence: first **tag**, then **filter**.

### Step 1: Tag Tools with Group Metadata

The `TagBasedGroupTransform` reads a YAML configuration file that maps tool name patterns to named groups:

```yaml
# tool_groups.yaml
groups:
  analytics:
    description: "Tools for data analysis, reporting, and insights"
    tools:
      - "dbt_*"
      - "atlan_*"
      - "github_*"
    roles:
      - "analyst"
      - "admin"

  platform_ops:
    description: "Infrastructure and platform management tools"
    tools:
      - "atlan_*"
      - "dbt_*"
      - "github_*"
    roles:
      - "devops"
      - "sre"
      - "admin"
```

The patterns use `fnmatch` syntax — standard shell-style wildcards. When a client lists tools, the transform runs each tool name against every group's patterns and attaches matching group names as metadata:

```python
class TagBasedGroupTransform(Transform):
    def _match_tool_to_groups(self, tool_name: str) -> list[str]:
        matching_groups: list[str] = []
        for group_name, group in self.tool_groups.items():
            for pattern in group.tools:
                if fnmatch.fnmatch(tool_name, pattern):
                    matching_groups.append(group_name)
                    break
        return matching_groups

    async def list_tools(self, tools: Sequence[Tool]) -> Sequence[Tool]:
        enhanced_tools: list[Tool] = []
        for tool in tools:
            matching_groups = self._match_tool_to_groups(tool.name)
            if matching_groups:
                existing_tags = set(tool.tags) if tool.tags else set()
                existing_tags.update(matching_groups)
                tool.tags = existing_tags

                if tool.meta is None:
                    tool.meta = {}
                tool.meta["groups"] = matching_groups
            enhanced_tools.append(tool)
        return enhanced_tools
```

After this step, a tool like `dbt_list_models` carries `groups: ["analytics", "platform_ops"]` in its metadata. The tool itself is unchanged — the transform only enriches it with classification data.

### Step 2: Filter by Role

The `RoleBasedAccessTransform` reads the user's role and only passes through tools whose groups match:

```python
class RoleBasedAccessTransform(Transform):
    def _get_allowed_groups(self, role: str) -> set[str]:
        if role == "agent-engine":
            return set(self.tool_groups.keys())  # Full access

        allowed: set[str] = set()
        for group_name, group in self.tool_groups.items():
            if role in group.roles:
                allowed.add(group_name)
        return allowed

    async def list_tools(self, tools: Sequence[Tool]) -> Sequence[Tool]:
        user_role = self._get_user_role()
        allowed_groups = self._get_allowed_groups(user_role)

        if user_role == "agent-engine":
            return tools  # Service account sees everything

        if not allowed_groups:
            return []  # Unknown roles see nothing

        filtered_tools: list[Tool] = []
        for tool in tools:
            tool_groups = set(tool.meta.get("groups", [])) if tool.meta else set()

            if not tool_groups:
                filtered_tools.append(tool)  # Ungrouped = system tool
                continue

            if tool_groups & allowed_groups:  # Set intersection
                filtered_tools.append(tool)

        return filtered_tools
```

The key design decision: the `agent-engine` role bypasses all filtering. When the agent engine connects to MaaS, it sees every tool across every upstream server. Per-request tool filtering happens in the agent engine itself (the `mcp_tools` field from Part 1). This two-layer model separates service-level access control (MaaS transforms) from request-level tool selection (agent engine).

Ungrouped tools — tools that don't match any pattern in `tool_groups.yaml` — are treated as system tools and always included. This means MaaS's own helper tools (`get_resource`, `get_prompt`, etc.) pass through regardless of role.

## Helper Tools: Bridging MCP Primitives

MCP defines four primitive types: **tools**, **resources**, **prompts**, and **resource templates**. Most MCP clients only interact with tools natively. MaaS bridges the gap by exposing the other primitives as callable tools:

```python
@mcp.tool()
async def get_resource(uri: str) -> str:
    """Retrieve the content of a resource by its URI."""
    client = await _get_maas_client()
    async with client:
        content = await client.read_resource(uri)
        if isinstance(content, list):
            return "\n".join(str(item) for item in content)
        return str(content)

@mcp.tool()
async def get_prompt(name: str, arguments: dict[str, str] | None = None) -> str:
    """Retrieve a rendered prompt by name with optional arguments."""
    return await _render_prompt(name, arguments)

@mcp.tool()
async def expand_resource_template(
    name: str, arguments: dict[str, str] | None = None
) -> str:
    """Expand a resource template URI with provided argument values."""
    client = await _get_maas_client()
    async with client:
        templates = await client.list_resource_templates()
        template = next((t for t in templates if t.name == name), None)
        if not template:
            raise ValueError(f"Resource template not found: {name}")

        # Validate required arguments
        required_vars = _parse_uri_template_vars(template.uri_template)
        provided_keys = set((arguments or {}).keys())
        missing = [v for v in required_vars if v not in provided_keys]
        if missing:
            raise ValueError(f"Missing required template arguments: {sorted(missing)}")

        return _expand_uri_template(template.uri_template, arguments or {})
```

This matters because the agent's LLM can only invoke tools. By wrapping resources and prompts as tools, the agent can dynamically fetch documentation, expand URI templates, and retrieve rendered prompts — all through the same tool-calling mechanism it already understands. The `expand_resource_template` tool includes RFC 6570 URI template parsing with argument validation, so the LLM gets clear error messages when it provides incomplete arguments.

## How AgentEngine Connects

On the agent engine side, the MaaS connection is a single `MCPServerStreamableHTTP` client:

```python
async def get_maas_client() -> MCPServerStreamableHTTP:
    """Create an MCP client connected to MaaS."""
    return MCPServerStreamableHTTP(url=settings.maas_endpoint)
```

Used as an async context manager, it handles the MCP connection lifecycle. When the agent engine discovers available components, it asks MaaS for everything in one call:

```python
@router.get("/components", tags=["MCP Components"])
async def get_components(
    servers: str | None = Query(None, description="Comma-separated server keys"),
) -> ComponentsResponse:
    async with await get_maas_client() as maas_client:
        tools_list = await maas_client.list_tools()
        prompts_list = await list_prompts(maas_client)
        resources_list = await maas_client.list_resources()
        templates_list = await maas_client.list_resource_templates()

        # Filter by server prefix if requested
        # Transform into schema objects
        # Return ComponentsResponse with all 4 component types
```

The optional `servers` query parameter lets the frontend filter by upstream server. Asking for `?servers=dbt` returns only dbt tools, prompts, and resources. This is a UI convenience — the agent engine uses it to show relevant tools per context, while the underlying MaaS connection always has access to everything (via the `agent-engine` role).

## Service Orchestration

Both services run as separate containers with a health check dependency:

```yaml
services:
  maas:
    build: ./maas
    ports:
      - "8000:8000"
    environment:
      - MCP_DBT_URL=${MCP_DBT_URL}
      - MCP_GITHUB_URL=${MCP_GITHUB_URL}
      - MCP_ATLAN_URL=${MCP_ATLAN_URL}
      # Auth tokens per server...

  agent-engine:
    build: ./agent-engine
    ports:
      - "8080:8080"
    environment:
      - MAAS_ENDPOINT=http://maas:8000/mcp
    depends_on:
      maas:
        condition: service_healthy
```

The agent engine does not start until MaaS passes its health check. Once running, the single `MAAS_ENDPOINT` is all the agent engine needs to access every upstream tool server. Credentials, transport details, and server discovery are all encapsulated in MaaS.

## Why This Decomposition Works

Splitting tool aggregation into its own service pays off in several ways:

**Independent scaling.** MaaS is lightweight — it proxies requests and filters tools. It does not hold state. The agent engine is compute-heavy (LLM orchestration, memory queries). They scale independently with different resource profiles.

**Credential isolation.** Upstream API tokens never touch the agent engine. MaaS is the only service that holds third-party credentials. This reduces the blast radius of a compromised agent engine container.

**Tool management without redeployment.** Updating `tool_groups.yaml` to change role-to-group mappings or adding a new upstream server only requires restarting MaaS. The agent engine picks up the changes on its next `/components` call.

**Testability.** Each transform is a pure function from `Sequence[Tool]` to `Sequence[Tool]`. You can test the tagging and filtering logic in isolation with mock tool lists, without any MCP servers running.

## What Comes Next

Part 3 will cover **production patterns**: the privacy-preserving history processor that redacts PII before it reaches the model, context budget management that summarizes old conversation history to stay within token limits, and OpenTelemetry instrumentation for tracing agent executions from HTTP request through tool calls to final response.
