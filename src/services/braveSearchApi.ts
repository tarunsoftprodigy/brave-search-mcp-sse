import {
  BRAVE_API_KEY,
  RATE_LIMIT,
  requestCount,
  API_ENDPOINTS
} from '../config/constants.js';
import {
  BraveWeb,
  BravePoiResponse,
  BraveDescription
} from '../types/braveSearch.js';

/**
 * Check if we've exceeded rate limits
 */
export function checkRateLimit() {
  const now = Date.now();
  if (now - requestCount.lastReset > 1000) {
    requestCount.second = 0;
    requestCount.lastReset = now;
  }
  if (requestCount.second >= RATE_LIMIT.perSecond ||
    requestCount.month >= RATE_LIMIT.perMonth) {
    throw new Error('Rate limit exceeded');
  }
  requestCount.second++;
  requestCount.month++;
}

/**
 * Perform a web search query
 */
export async function performWebSearch(query: string, count: number = 10, offset: number = 0) {
  checkRateLimit();
  const url = new URL(API_ENDPOINTS.webSearch);
  url.searchParams.set('q', query);
  url.searchParams.set('count', Math.min(count, 20).toString()); // API limit
  url.searchParams.set('offset', offset.toString());

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Brave API error: ${response.status} ${response.statusText}\n${await response.text()}`);
  }

  const data = await response.json() as BraveWeb;

  // Extract just web results
  const results = (data.web?.results || []).map((result) => ({
    title: result.title || '',
    description: result.description || '',
    url: result.url || ''
  }));

  return results.map((result) =>
    `Title: ${result.title}\nDescription: ${result.description}\nURL: ${result.url}`
  ).join('\n\n');
}

/**
 * Perform a local search query
 */
export async function performLocalSearch(query: string, count: number = 5) {
  checkRateLimit();
  // Initial search to get location IDs
  const webUrl = new URL(API_ENDPOINTS.webSearch);
  webUrl.searchParams.set('q', query);
  webUrl.searchParams.set('search_lang', 'en');
  webUrl.searchParams.set('result_filter', 'locations');
  webUrl.searchParams.set('count', Math.min(count, 20).toString());

  const webResponse = await fetch(webUrl, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY
    }
  });

  if (!webResponse.ok) {
    throw new Error(`Brave API error: ${webResponse.status} ${webResponse.statusText}\n${await webResponse.text()}`);
  }

  const webData = await webResponse.json() as BraveWeb;
  const locationIds = webData.locations?.results?.filter((result): result is { id: string; title?: string } => result.id != null).map((result) => result.id) || [];

  if (locationIds.length === 0) {
    return performWebSearch(query, count); // Fallback to web search
  }

  // Get POI details and descriptions in parallel
  const [poisData, descriptionsData] = await Promise.all([
    getPoisData(locationIds),
    getDescriptionsData(locationIds)
  ]);

  return formatLocalResults(poisData, descriptionsData);
}

/**
 * Get POI (Point of Interest) data for location IDs
 */
export async function getPoisData(ids: string[]): Promise<BravePoiResponse> {
  checkRateLimit();
  const url = new URL(API_ENDPOINTS.pois);
  ids.filter(Boolean).forEach(id => url.searchParams.append('ids', id));
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Brave API error: ${response.status} ${response.statusText}\n${await response.text()}`);
  }

  const poisResponse = await response.json() as BravePoiResponse;
  return poisResponse;
}

/**
 * Get descriptions for location IDs
 */
export async function getDescriptionsData(ids: string[]): Promise<BraveDescription> {
  checkRateLimit();
  const url = new URL(API_ENDPOINTS.descriptions);
  ids.filter(Boolean).forEach(id => url.searchParams.append('ids', id));
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Brave API error: ${response.status} ${response.statusText}\n${await response.text()}`);
  }

  const descriptionsData = await response.json() as BraveDescription;
  return descriptionsData;
}

/**
 * Format local search results for display
 */
export function formatLocalResults(poisData: BravePoiResponse, descData: BraveDescription): string {
  return (poisData.results || []).map((poi) => {
    const address = [
      poi.address?.streetAddress ?? '',
      poi.address?.addressLocality ?? '',
      poi.address?.addressRegion ?? '',
      poi.address?.postalCode ?? ''
    ].filter(part => part !== '').join(', ') || 'N/A';

    return `Name: ${poi.name}
Address: ${address}
Phone: ${poi.phone || 'N/A'}
Rating: ${poi.rating?.ratingValue ?? 'N/A'} (${poi.rating?.ratingCount ?? 0} reviews)
Price Range: ${poi.priceRange || 'N/A'}
Hours: ${(poi.openingHours || []).join(', ') || 'N/A'}
Description: ${descData.descriptions[poi.id] || 'No description available'}
`;
  }).join('\n---\n') || 'No local results found';
} 