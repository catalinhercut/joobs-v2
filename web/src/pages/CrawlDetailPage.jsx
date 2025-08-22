import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { ArrowLeft, ExternalLink, Calendar, FileText, Globe, Hash, Clock } from "lucide-react";

export const CrawlDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [crawl, setCrawl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  useEffect(() => {
    loadCrawlDetail();
  }, [id]);

  const loadCrawlDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/crawl/results/${id}`);
      
      if (!res.ok) {
        throw new Error(`Failed to load crawl details: ${res.status}`);
      }
      
      const data = await res.json();
      setCrawl(data);
    } catch (error) {
      console.error("Failed to load crawl details:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatContent = (content) => {
    if (!content) return "";
    return content.replace(/\n\s*\n/g, '\n\n').trim();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading crawl details...</p>
        </div>
      </div>
    );
  }

  if (error || !crawl) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              {error || "Crawl not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metadata = crawl.metadata || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Crawl Details</h1>
            <p className="text-muted-foreground">ID: {crawl.id}</p>
          </div>
        </div>
        <Badge variant={crawl.status === "success" ? "default" : "destructive"}>
          {crawl.status}
        </Badge>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="mr-2 h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <p className="text-sm mt-1">{crawl.title || "No title"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="mt-1">
                <Badge variant={crawl.status === "success" ? "default" : "destructive"}>
                  {crawl.status}
                </Badge>
              </div>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">URL</Label>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-sm break-all flex-1">{crawl.url}</p>
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={crawl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Crawled At</Label>
              <div className="flex items-center mt-1">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{formatDate(crawl.crawled_at)}</p>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Content Length</Label>
              <div className="flex items-center mt-1">
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{crawl.content?.length || 0} characters</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      {metadata && Object.keys(metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Hash className="mr-2 h-5 w-5" />
              Metadata
            </CardTitle>
            <CardDescription>
              Additional information extracted from the webpage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metadata.description && (
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm mt-1">{metadata.description}</p>
                </div>
              )}
              {metadata.keywords && (
                <div>
                  <Label className="text-sm font-medium">Keywords</Label>
                  <p className="text-sm mt-1">{metadata.keywords}</p>
                </div>
              )}
              {metadata.author && (
                <div>
                  <Label className="text-sm font-medium">Author</Label>
                  <p className="text-sm mt-1">{metadata.author}</p>
                </div>
              )}
              {metadata.ogTitle && (
                <div>
                  <Label className="text-sm font-medium">Open Graph Title</Label>
                  <p className="text-sm mt-1">{metadata.ogTitle}</p>
                </div>
              )}
              {metadata.ogDescription && (
                <div>
                  <Label className="text-sm font-medium">Open Graph Description</Label>
                  <p className="text-sm mt-1">{metadata.ogDescription}</p>
                </div>
              )}
              {metadata.contentType && (
                <div>
                  <Label className="text-sm font-medium">Content Type</Label>
                  <p className="text-sm mt-1">{metadata.contentType}</p>
                </div>
              )}
              {metadata.statusCode && (
                <div>
                  <Label className="text-sm font-medium">HTTP Status</Label>
                  <p className="text-sm mt-1">{metadata.statusCode}</p>
                </div>
              )}
              {metadata.timestamp && (
                <div>
                  <Label className="text-sm font-medium">Processed At</Label>
                  <div className="flex items-center mt-1">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{formatDate(metadata.timestamp)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Extracted Content
          </CardTitle>
          <CardDescription>
            The text content extracted from the webpage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {crawl.content ? (
            <div className="bg-muted/50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {formatContent(crawl.content)}
              </pre>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No content available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};