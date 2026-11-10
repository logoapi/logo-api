# logoapi-mcp

Company logos and favicons by domain, as an MCP server for stdio clients. A small bridge to the hosted LogoAPI MCP server at https://logoapi.sh/mcp. Free, no key, no dependencies.

Tools: `get_logo`, `get_favicon`, `search_logos`. They return URLs to hot-link in `<img>` tags, never image bytes.

## Use

Claude Desktop, Cursor or any client that starts MCP servers over stdio:

```json
{
  "mcpServers": {
    "logoapi": { "command": "npx", "args": ["-y", "logoapi-mcp"] }
  }
}
```

Clients that support remote servers can connect to `https://logoapi.sh/mcp` directly and skip this package.

## Notes

- Node 18 or newer.
- `LOGOAPI_MCP_URL` overrides the server URL.
- Requests time out after 30 seconds. Any failure comes back as a JSON-RPC error with the request id; stdout carries JSON-RPC only, logs go to stderr.
- Docs: [logoapi.sh/docs/mcp](https://logoapi.sh/docs/mcp). Source: [github.com/logoapi/logo-api](https://github.com/logoapi/logo-api).

MIT.
