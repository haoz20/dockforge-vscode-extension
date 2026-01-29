import * as https from "https";

export interface DockerHubRepository {
  name: string; // e.g., "library/ubuntu"
  description?: string;
  starCount?: number;
  pullCount?: number;
  official?: boolean;
  verified?: boolean;
}

export interface DockerHubTag {
  name: string; // e.g., "20.04"
  lastUpdated?: string;
  digest?: string;
  fullSize?: number;
  status?: string;
  architectures?: string[];
  osList?: string[];
}

interface DockerHubSearchResponse {
  count: number;
  results: Array<{
    repo_name: string;
    short_description?: string;
    star_count?: number;
    pull_count?: number;
    is_official?: boolean;
    is_verified?: boolean;
  }>;
}

interface DockerHubTagsResponse {
  count: number;
  results: Array<{
    name: string;
    last_updated?: string;
    full_size?: number;
    images?: Array<{
      architecture?: string;
      os?: string;
      digest?: string;
    }>;
    digest?: string;
    tag_status?: string;
  }>;
}

/**
 * Minimal HTTPS JSON fetcher to avoid adding new dependencies.
 */
function fetchJson<T>(url: string, token?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: "GET",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            }
          : { Accept: "application/json" },
      },
      (response) => {
        let body = "";

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          if (response.statusCode && response.statusCode >= 400) {
            const reason = response.statusMessage ?? "Unknown error";
            reject(new Error(`Docker Hub API ${response.statusCode}: ${reason}`));
            return;
          }

          try {
            resolve(JSON.parse(body) as T);
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on("error", (error) => reject(error));
    request.end();
  });
}

/**
 * Search Docker Hub repositories by query.
 * Uses public search endpoint (no auth required, but rate limited).
 */
export async function searchDockerHubRepositories(
  query: string,
  limit = 15,
  token?: string
): Promise<DockerHubRepository[]> {
  if (!query.trim()) {
    return [];
  }

  const url = `https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(
    query
  )}&page_size=${limit}`;

  const data = await fetchJson<DockerHubSearchResponse>(url, token);

  return (data.results || []).map((item) => ({
    name: item.repo_name,
    description: item.short_description,
    starCount: item.star_count,
    pullCount: item.pull_count,
    official: item.is_official,
    verified: item.is_verified,
  }));
}

/**
 * Fetch tag list for a repository.
 * Namespace defaults to "library" if omitted.
 */
export async function fetchDockerHubTags(
  fullRepository: string,
  limit = 25,
  token?: string
): Promise<DockerHubTag[]> {
  const [namespace, repo] = normalizeRepository(fullRepository);
  const url = `https://hub.docker.com/v2/repositories/${namespace}/${repo}/tags?page_size=${limit}&page=1`;
  const data = await fetchJson<DockerHubTagsResponse>(url, token);

  return (data.results || []).map((tag) => ({
    name: tag.name,
    lastUpdated: tag.last_updated,
    digest: tag.digest ?? tag.images?.[0]?.digest,
    fullSize: tag.full_size,
    status: tag.tag_status,
    architectures: Array.from(
      new Set((tag.images || []).map((img) => img.architecture).filter(Boolean) as string[])
    ),
    osList: Array.from(
      new Set((tag.images || []).map((img) => img.os).filter(Boolean) as string[])
    ),
  }));
}

/**
 * Normalize repository name into [namespace, repository].
 * Examples:
 *   "ubuntu" => ["library", "ubuntu"]
 *   "library/node" => ["library", "node"]
 *   "myorg/app" => ["myorg", "app"]
 */
export function normalizeRepository(fullRepository: string): [string, string] {
  const trimmed = fullRepository.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) {
    return ["library", ""];
  }

  const parts = trimmed.split("/");
  if (parts.length === 1) {
    return ["library", parts[0]];
  }

  return [parts[0], parts.slice(1).join("/")];
}
