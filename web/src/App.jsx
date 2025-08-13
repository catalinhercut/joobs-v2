import React from "react";

export const App = () => {
  const [ping, setPing] = React.useState(null);
  const [crawlUrl, setCrawlUrl] = React.useState("");
  const [crawlResult, setCrawlResult] = React.useState(null);
  const [crawlResults, setCrawlResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const apiBase = import.meta.env.VITE_API_BASE_URL;

  React.useEffect(() => {
    const call = async () => {
      const res = await fetch(`${apiBase}/health`);
      setPing({ status: res.status, at: new Date().toISOString() });
    };
    call().catch(console.error);

    // Load recent crawl results
    loadCrawlResults();
  }, []);

  const loadCrawlResults = async () => {
    try {
      const res = await fetch(`${apiBase}/crawl/results?limit=5`);
      const data = await res.json();
      setCrawlResults(data.results || []);
    } catch (error) {
      console.error("Failed to load crawl results:", error);
    }
  };

  const handleCrawl = async (e) => {
    e.preventDefault();
    if (!crawlUrl.trim()) return;

    setLoading(true);
    setCrawlResult(null);

    try {
      const res = await fetch(`${apiBase}/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl.trim() }),
      });

      const result = await res.json();
      setCrawlResult(result);

      if (result.success) {
        loadCrawlResults(); // Refresh the list
      }
    } catch (error) {
      setCrawlResult({ error: error.message, success: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        maxWidth: 1200,
      }}
    >
      <h1>Web Crawler Dashboard</h1>

      <div style={{ marginBottom: 32 }}>
        <h2>System Status</h2>
        <p>API base: {apiBase}</p>
        <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4 }}>
          {JSON.stringify(ping, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2>Crawl URL</h2>
        <form
          onSubmit={handleCrawl}
          style={{ display: "flex", gap: 12, marginBottom: 16 }}
        >
          <input
            type="url"
            value={crawlUrl}
            onChange={(e) => setCrawlUrl(e.target.value)}
            placeholder="https://example.com"
            style={{ flex: 1, padding: 8, fontSize: 16 }}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{ padding: "8px 16px", fontSize: 16 }}
          >
            {loading ? "Crawling..." : "Crawl"}
          </button>
        </form>

        {crawlResult && (
          <div
            style={{
              background: crawlResult.success ? "#e8f5e8" : "#ffe8e8",
              padding: 16,
              borderRadius: 4,
              marginBottom: 16,
            }}
          >
            <h3>Crawl Result</h3>
            {crawlResult.success ? (
              <div>
                <p>
                  <strong>Title:</strong> {crawlResult.title || "No title"}
                </p>
                <p>
                  <strong>URL:</strong> {crawlResult.url}
                </p>
                <p>
                  <strong>Content Length:</strong>{" "}
                  {crawlResult.content?.length || 0} characters
                </p>
                <p>
                  <strong>Crawled:</strong>{" "}
                  {new Date(crawlResult.crawled_at).toLocaleString()}
                </p>
              </div>
            ) : (
              <p style={{ color: "red" }}>
                <strong>Error:</strong> {crawlResult.error}
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <h2>Recent Crawl Results</h2>
        {crawlResults.length === 0 ? (
          <p>No crawl results yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {crawlResults.map((result) => (
              <div
                key={result.id}
                style={{
                  border: "1px solid #ddd",
                  padding: 16,
                  borderRadius: 4,
                  background:
                    result.status === "success" ? "#f9f9f9" : "#fff5f5",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: 8,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 16 }}>
                    {result.title || "No title"}
                  </h3>
                  <span
                    style={{
                      fontSize: 12,
                      color: result.status === "success" ? "green" : "red",
                      fontWeight: "bold",
                    }}
                  >
                    {result.status}
                  </span>
                </div>
                <p style={{ margin: "4px 0", fontSize: 14, color: "#666" }}>
                  <strong>URL:</strong>{" "}
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {result.url}
                  </a>
                </p>
                <p style={{ margin: "4px 0", fontSize: 14, color: "#666" }}>
                  <strong>Crawled:</strong>{" "}
                  {new Date(result.crawled_at).toLocaleString()}
                </p>
                {result.content && (
                  <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>
                    <strong>Content:</strong> {result.content.substring(0, 200)}
                    {result.content.length > 200 && "..."}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default App;
