import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { performWebSearch } from "../services/braveSearchApi.js";
import { isBraveWebSearchArgs, WebSearchArgs } from "../types/braveSearch.js";
import { searchRequestsTotal, searchResponseTime, searchErrors } from "../services/metrics.js";

// Web Search Tool definition
export const WEB_SEARCH_TOOL: Tool = {
  name: "brave_web_search",
  description:
    "Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. " +
    "Use this for broad information gathering, recent events, or when you need diverse web sources. " +
    "Supports pagination, content filtering, and freshness controls. " +
    "Maximum 20 results per request, with offset for pagination. ",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (max 400 chars, 50 words)"
      },
      count: {
        type: "number",
        description: "Number of results (1-20, default 10)",
        default: 10
      },
      offset: {
        type: "number",
        description: "Pagination offset (max 9, default 0)",
        default: 0
      },
    },
    required: ["query"],
  },
};

// Handler for web search requests
export async function handleWebSearch(args: unknown) {
  // Track request
  searchRequestsTotal.inc({ type: 'web' });
  
  const startTime = Date.now();
  try {
    if (!isBraveWebSearchArgs(args)) {
      throw new Error("Invalid arguments for brave_web_search");
    }
    
    const { query, count = 10, offset = 0 } = args as WebSearchArgs;
    const results = await performWebSearch(query, count, offset);
    
    // Track response time
    const duration = (Date.now() - startTime) / 1000;
    searchResponseTime.observe({ type: 'web' }, duration);
    
    return {
      content: [{ type: "text", text: results }],
      isError: false,
    };
  } catch (error) {
    // Track error
    searchErrors.inc({ 
      type: 'web',
      error: error instanceof Error ? error.message : 'unknown'
    });
    throw error;
  }
} 