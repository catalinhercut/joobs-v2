import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Loader2, ExternalLink, Calendar, FileText } from "lucide-react";

export const HomePage = () => {
  const [crawlUrl, setCrawlUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [crawlResult, setCrawlResult] = useState(null);
  const [recentCrawls, setRecentCrawls] = useState([]);
  const [loading, setLoading] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  useEffect(() => {
    loadRecentCrawls();
  }, []);

  const loadRecentCrawls = async () => {
    try {
      const res = await fetch(`${apiBase}/crawl/results?limit=5`);
      const data = await res.json();
      setRecentCrawls(data.results || []);
    } catch (error) {
      console.error("Failed to load recent crawls:", error);
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
        body: JSON.stringify({ 
          url: crawlUrl.trim(),
          prompt: prompt.trim() || undefined,
          options: {
            extractionPrompt: prompt.trim() || undefined
          }
        }),
      });

      const result = await res.json();
      setCrawlResult(result);

      if (result.success) {
        loadRecentCrawls();
        setCrawlUrl("");
        setPrompt("");
      }
    } catch (error) {
      setCrawlResult({ error: error.message, success: false });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text, maxLength = 150) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Web Crawler Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Extract and analyze content from any website with AI-powered prompts
        </p>
      </div>

      {/* Crawl Form */}
      <Card>
        <CardHeader>
          <CardTitle>New Crawl</CardTitle>
          <CardDescription>
            Enter a URL and optional prompt to extract specific information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCrawl} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                type="url"
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                placeholder="https://example.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prompt">Extraction Prompt (Optional)</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Extract all product names and prices, or summarize the main points of this article..."
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Provide specific instructions for what information to extract from the webpage
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Crawling..." : "Start Crawl"}
            </Button>
          </form>

          {/* Crawl Result */}
          {crawlResult && (
            <div className="mt-6">
              <Card className={crawlResult.success ? "border-green-200" : "border-red-200"}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Crawl Result</span>
                    <Badge variant={crawlResult.success ? "default" : "destructive"}>
                      {crawlResult.success ? "Success" : "Error"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {crawlResult.success ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Title</Label>
                        <p className="text-sm">{crawlResult.title || "No title"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">URL</Label>
                        <p className="text-sm break-all">{crawlResult.url}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Content Length</Label>
                        <p className="text-sm">{crawlResult.content?.length || 0} characters</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Crawled At</Label>
                        <p className="text-sm">{formatDate(crawlResult.crawled_at)}</p>
                      </div>
                      <Button asChild size="sm">
                        <Link to={`/crawl/${crawlResult.id}`}>
                          <FileText className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-red-600">
                      <Label className="text-sm font-medium">Error</Label>
                      <p className="text-sm">{crawlResult.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Crawls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Crawls</CardTitle>
            <CardDescription>Your latest crawling activities</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/history">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentCrawls.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No crawls yet. Start by entering a URL above.
            </p>
          ) : (
            <div className="space-y-4">
              {recentCrawls.map((crawl) => (
                <div
                  key={crawl.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium truncate">
                        {crawl.title || "Untitled"}
                      </h3>
                      <Badge variant={crawl.status === "success" ? "default" : "destructive"}>
                        {crawl.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-1">
                      {crawl.url}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground space-x-4">
                      <span className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        {formatDate(crawl.crawled_at)}
                      </span>
                      {crawl.content && (
                        <span>{crawl.content.length} chars</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={crawl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/crawl/${crawl.id}`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Details
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};