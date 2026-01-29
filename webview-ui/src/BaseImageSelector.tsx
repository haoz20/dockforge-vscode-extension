import { useEffect, useRef, useState } from "react";
import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import { vscode } from "./utilities/vscode";

interface BaseImageSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

interface RepoOption {
  apiName: string; // e.g., "library/ubuntu"
  displayName: string; // e.g., "ubuntu"
  description?: string;
  starCount?: number;
  official?: boolean;
  verified?: boolean;
}

interface TagOption {
  name: string;
  architectures?: string[];
  osList?: string[];
}

const popularRepos = ["ubuntu", "node", "python", "alpine", "golang", "openjdk"];

function parseBaseImage(baseImage: string): { repo: string; tag: string } {
  if (!baseImage) return { repo: "", tag: "latest" };
  const [repoPart, tagPart] = baseImage.split(":");
  return { repo: repoPart ?? "", tag: tagPart ?? "latest" };
}

export default function BaseImageSelector({ value, onChange }: BaseImageSelectorProps) {
  const parsed = parseBaseImage(value);
  const [searchTerm, setSearchTerm] = useState(parsed.repo);
  const [selectedRepo, setSelectedRepo] = useState(parsed.repo);
  const [selectedTag, setSelectedTag] = useState(parsed.tag || "latest");
  const [searchResults, setSearchResults] = useState<RepoOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestedRepoRef = useRef<string | null>(null);

  // Keep internal state in sync when parent value changes externally
  useEffect(() => {
    const parsedValue = parseBaseImage(value);
    setSelectedRepo(parsedValue.repo);
    setSelectedTag(parsedValue.tag);
    setSearchTerm(parsedValue.repo);
  }, [value]);

  // Listen for messages from the extension
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case "dockerHubSearchResults": {
          setSearching(false);
          const mapped: RepoOption[] = (message.results || []).map((r: any) => ({
            apiName: r.name,
            displayName: (r.name as string).replace(/^library\//, ""),
            description: r.description,
            starCount: r.starCount,
            official: r.official,
            verified: r.verified,
          }));
          setSearchResults(mapped);
          return;
        }
        case "dockerHubTagsResult": {
          const repoFromApi: string = message.repository;
          const displayRepo = repoFromApi?.replace(/^library\//, "") ?? repoFromApi;
          if (
            lastRequestedRepoRef.current &&
            repoFromApi !== lastRequestedRepoRef.current
          ) {
            return;
          }
          setLoadingTags(false);
          const tagOptions: TagOption[] = (message.tags || []).map((t: any) => ({
            name: t.name,
            architectures: t.architectures,
            osList: t.osList,
          }));
          setTags(tagOptions);

          if (tagOptions.length > 0) {
            const nextTag = tagOptions[0].name;
            setSelectedRepo(displayRepo);
            setSelectedTag(nextTag);
            onChange(`${displayRepo}:${nextTag}`);
          }
          return;
        }
        case "dockerHubError": {
          setSearching(false);
          setLoadingTags(false);
          setError(message.message ?? "Failed to reach Docker Hub");
          return;
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onChange]);

  // Debounced search trigger
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (!searchTerm || searchTerm.trim().length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      setError(null);
      vscode.postMessage({
        type: "dockerHubSearch",
        query: searchTerm.trim(),
      });
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  const selectRepository = (option: RepoOption) => {
    setSelectedRepo(option.displayName);
    setSearchTerm(option.displayName);
    setTags([]);
    setSelectedTag("latest");
    setLoadingTags(true);
    setError(null);
    lastRequestedRepoRef.current = option.apiName;
    vscode.postMessage({
      type: "dockerHubFetchTags",
      repository: option.apiName,
    });
  };

  const applyTag = (tagName: string) => {
    setSelectedTag(tagName);
    onChange(`${selectedRepo || searchTerm}:${tagName}`);
  };

  const applyManual = () => {
    const repo = searchTerm.trim();
    if (!repo) return;
    const next = `${repo}:${selectedTag || "latest"}`;
    setSelectedRepo(repo);
    onChange(next);
  };

  return (
    <div className="base-image-selector">
      <div className="selector-row">
        <VSCodeTextField
          className="flex-1"
          placeholder="Search Docker Hub (e.g. ubuntu, node, python)"
          value={searchTerm}
          onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
        />
        <VSCodeButton appearance="secondary" onClick={applyManual}>
          Use
        </VSCodeButton>
      </div>

      <div className="popular-row">
        {popularRepos.map((repo) => (
          <button
            key={repo}
            className={`chip ${repo === selectedRepo ? "chip--active" : ""}`}
            onClick={() =>
              selectRepository({
                apiName: repo,
                displayName: repo,
              })
            }
            type="button"
          >
            {repo}
          </button>
        ))}
      </div>

      {error && <div className="error-text">{error}</div>}

      {searching && <div className="muted">Searching Docker Hub…</div>}

      {!searching && searchResults.length > 0 && (
        <div className="results-list">
          {searchResults.slice(0, 6).map((result) => (
            <div
              key={result.apiName}
              className="result-item"
              onClick={() => selectRepository(result)}
            >
              <div className="result-title">
                <span>{result.displayName}</span>
                {result.official && <span className="badge">official</span>}
                {result.verified && <span className="badge">verified</span>}
              </div>
              {result.description && (
                <div className="result-desc">{result.description}</div>
              )}
              <div className="result-meta">
                {typeof result.starCount === "number" && (
                  <span>★ {result.starCount}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="tag-row">
        <label className="field-label">Tag</label>
        <VSCodeDropdown
          disabled={loadingTags || tags.length === 0}
          value={selectedTag}
          onChange={(e) => applyTag((e.target as HTMLSelectElement).value)}
          style={{ width: "100%" }}
        >
          {(tags.length > 0 ? tags : [{ name: selectedTag || "latest" }]).map(
            (tag) => (
              <VSCodeOption key={tag.name} value={tag.name}>
                {tag.name}
              </VSCodeOption>
            )
          )}
        </VSCodeDropdown>
        {loadingTags && <div className="muted">Loading tags…</div>}
      </div>

      <div className="selected-text">
        Selected base image:{" "}
        <code>{`${selectedRepo || searchTerm}:${selectedTag || "latest"}`}</code>
      </div>
    </div>
  );
}
