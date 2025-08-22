import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { ArrowLeft, ExternalLink, Calendar, FileText, Globe, Hash, Clock, RotateCcw, Copy, Eye, Code, Type, Search, CheckCircle, AlertCircle, Target, Zap, BarChart3, Filter } from "lucide-react";

// Content Analysis Component
const ContentAnalysis = ({ content, metadata }) => {
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (content) {
      analyzeContent(content, metadata);
    }
  }, [content, metadata]);

  const analyzeContent = (text, meta) => {
    const lines = text.split('\n');
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Extract potential structured data
    const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
    const phones = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    const prices = text.match(/\$\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:USD|EUR|GBP)/gi) || [];
    const dates = text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\w+\s+\d{1,2},?\s+\d{4}\b/g) || [];
    
    // Analyze content structure
    const headings = lines.filter(line => 
      line.trim().length > 0 && 
      (line.trim().length < 100) && 
      (line.match(/^[A-Z]/) || line.includes(':'))
    );
    
    // Check if extraction prompt was fulfilled
    const extractionPrompt = meta?.extractionPrompt || '';
    let promptFulfillment = null;
    
    if (extractionPrompt) {
      const promptKeywords = extractionPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const contentLower = text.toLowerCase();
      const foundKeywords = promptKeywords.filter(keyword => contentLower.includes(keyword));
      
      promptFulfillment = {
        requested: promptKeywords,
        found: foundKeywords,
        fulfillmentRate: promptKeywords.length > 0 ? (foundKeywords.length / promptKeywords.length) * 100 : 0
      };
    }

    setAnalysis({
      basic: {
        characters: text.length,
        words: words.length,
        sentences: sentences.length,
        lines: lines.length,
        paragraphs: text.split(/\n\s*\n/).length
      },
      structure: {
        headings: headings.slice(0, 10),
        avgWordsPerSentence: Math.round(words.length / Math.max(sentences.length, 1)),
        avgCharsPerWord: Math.round(text.length / Math.max(words.length, 1))
      },
      extracted: {
        emails,
        phones,
        urls,
        prices,
        dates
      },
      promptFulfillment
    });
  };

  if (!analysis) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="mr-2 h-5 w-5" />
          Content Analysis
        </CardTitle>
        <CardDescription>
          Detailed analysis of extracted content and fulfillment of extraction requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prompt Fulfillment */}
        {analysis.promptFulfillment && (
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center">
                <Target className="mr-2 h-4 w-4" />
                Extraction Requirements
              </h4>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  analysis.promptFulfillment.fulfillmentRate >= 80 ? 'bg-green-500' :
                  analysis.promptFulfillment.fulfillmentRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium">
                  {Math.round(analysis.promptFulfillment.fulfillmentRate)}% fulfilled
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">REQUESTED KEYWORDS</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.promptFulfillment.requested.map((keyword, i) => (
                    <Badge 
                      key={i} 
                      variant={analysis.promptFulfillment.found.includes(keyword) ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {analysis.promptFulfillment.found.includes(keyword) && <CheckCircle className="mr-1 h-3 w-3" />}
                      {!analysis.promptFulfillment.found.includes(keyword) && <AlertCircle className="mr-1 h-3 w-3" />}
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-xs font-medium text-muted-foreground">FULFILLMENT STATUS</Label>
                <div className="mt-1">
                  {analysis.promptFulfillment.fulfillmentRate >= 80 ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="mr-1 h-4 w-4" />
                      <span className="text-sm">Requirements well satisfied</span>
                    </div>
                  ) : analysis.promptFulfillment.fulfillmentRate >= 50 ? (
                    <div className="flex items-center text-yellow-600">
                      <AlertCircle className="mr-1 h-4 w-4" />
                      <span className="text-sm">Partially satisfied</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <AlertCircle className="mr-1 h-4 w-4" />
                      <span className="text-sm">Requirements not well met</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Basic Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold">{analysis.basic.words.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Words</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold">{analysis.basic.sentences.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Sentences</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold">{analysis.basic.paragraphs}</div>
            <div className="text-xs text-muted-foreground">Paragraphs</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold">{analysis.structure.avgWordsPerSentence}</div>
            <div className="text-xs text-muted-foreground">Avg Words/Sentence</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold">{analysis.structure.avgCharsPerWord}</div>
            <div className="text-xs text-muted-foreground">Avg Chars/Word</div>
          </div>
        </div>

        {/* Extracted Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(analysis.extracted).map(([type, items]) => (
            items.length > 0 && (
              <div key={type} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium capitalize">{type}</Label>
                  <Badge variant="outline">{items.length}</Badge>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {items.slice(0, 5).map((item, i) => (
                    <div key={i} className="text-xs p-1 bg-muted/50 rounded truncate">
                      {item}
                    </div>
                  ))}
                  {items.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      +{items.length - 5} more...
                    </div>
                  )}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Content Structure */}
        {analysis.structure.headings.length > 0 && (
          <div className="p-3 border rounded-lg">
            <Label className="text-sm font-medium mb-2 block">Content Structure</Label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {analysis.structure.headings.map((heading, i) => (
                <div key={i} className="text-xs p-1 bg-muted/50 rounded truncate">
                  {heading}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Content Renderer Component
const ContentRenderer = ({ content }) => {
  const [viewMode, setViewMode] = useState('formatted');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
  };

  const detectContentType = (text) => {
    // Check for structured data patterns
    if (text.includes('```') || text.includes('function') || text.includes('class ') || text.includes('const ') || text.includes('import ')) {
      return 'code';
    }
    if (text.includes('- ') || text.includes('* ') || /^\d+\./m.test(text) || text.includes('• ')) {
      return 'list';
    }
    if (text.includes('|') && text.includes('---')) {
      return 'table';
    }
    if (text.includes('Games found:') || text.includes('Play now') || text.includes('Casino') || text.includes('Jackpot')) {
      return 'games';
    }
    if (text.includes('{') && text.includes('}') && (text.includes('"') || text.includes("'"))) {
      return 'json';
    }
    return 'text';
  };

  const formatContent = (text) => {
    if (!text) return '';
    
    // Clean up the text
    let formatted = text.replace(/\n\s*\n/g, '\n\n').trim();
    
    // Highlight search terms
    if (searchTerm) {
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      formatted = formatted.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
    }
    
    return formatted;
  };

  const renderFormattedContent = () => {
    const contentType = detectContentType(content);
    const formatted = formatContent(content);
    
    switch (contentType) {
      case 'code':
        return (
          <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
              <code dangerouslySetInnerHTML={{ __html: formatted }} />
            </pre>
          </div>
        );
      
      case 'json':
        try {
          const jsonContent = JSON.parse(formatted);
          return (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{JSON.stringify(jsonContent, null, 2)}</code>
              </pre>
            </div>
          );
        } catch {
          return (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code dangerouslySetInnerHTML={{ __html: formatted }} />
              </pre>
            </div>
          );
        }
      
      case 'games':
        const lines = formatted.split('\n');
        const gameLines = lines.filter(line => 
          line.trim() && 
          !line.includes('Full page content:') && 
          !line.includes('Games found:')
        );
        
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {gameLines.slice(0, 20).map((game, i) => (
                <div key={i} className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
                  <Zap className="inline mr-1 h-3 w-3 text-blue-500" />
                  {game.trim()}
                </div>
              ))}
            </div>
            {gameLines.length > 20 && (
              <div className="text-center">
                <Badge variant="outline">+{gameLines.length - 20} more games</Badge>
              </div>
            )}
            {lines.find(line => line.includes('Full page content:')) && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium mb-2">Show full page content</summary>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div 
                    className="whitespace-pre-wrap leading-relaxed text-xs"
                    dangerouslySetInnerHTML={{ 
                      __html: lines.slice(lines.findIndex(line => line.includes('Full page content:')) + 1)
                        .join('\n')
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/^/, '<p>')
                        .replace(/$/, '</p>') 
                    }}
                  />
                </div>
              </details>
            )}
          </div>
        );
      
      case 'list':
        const listItems = formatted.split('\n').filter(line => line.trim());
        return (
          <div className="space-y-2">
            {listItems.map((item, i) => (
              <div key={i} className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <div 
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: item.replace(/^[-*•]\s*/, '') }}
                />
              </div>
            ))}
          </div>
        );
      
      case 'table':
        return (
          <div className="overflow-x-auto">
            <div 
              className="whitespace-pre-wrap font-mono text-sm"
              dangerouslySetInnerHTML={{ __html: formatted }}
            />
          </div>
        );
      
      default:
        const paragraphs = formatted.split('\n\n').filter(p => p.trim());
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert space-y-4">
            {paragraphs.map((paragraph, i) => (
              <p 
                key={i}
                className="leading-relaxed"
                dangerouslySetInnerHTML={{ __html: paragraph.replace(/\n/g, '<br/>') }}
              />
            ))}
          </div>
        );
    }
  };

  const contentType = detectContentType(content);
  const lines = content.split('\n').length;
  const words = content.split(/\s+/).length;
  const chars = content.length;

  return (
    <div className="space-y-4">
      {/* Content Stats & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
          <span className="flex items-center">
            <Type className="mr-1 h-4 w-4" />
            {words} words
          </span>
          <span className="flex items-center">
            <FileText className="mr-1 h-4 w-4" />
            {lines} lines
          </span>
          <span className="flex items-center">
            <Hash className="mr-1 h-4 w-4" />
            {chars} chars
          </span>
          <Badge variant="outline" className="capitalize">
            {contentType}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'formatted' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('formatted')}
              className="rounded-r-none"
            >
              <Eye className="mr-1 h-4 w-4" />
              Formatted
            </Button>
            <Button
              variant={viewMode === 'raw' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('raw')}
              className="rounded-l-none"
            >
              <Code className="mr-1 h-4 w-4" />
              Raw
            </Button>
          </div>
          
          {/* Copy Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="flex items-center"
          >
            <Copy className="mr-1 h-4 w-4" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* Content Display */}
      <div className="border rounded-lg">
        {viewMode === 'formatted' ? (
          <div className="p-6">
            {renderFormattedContent()}
          </div>
        ) : (
          <div className="bg-muted/50 p-4">
            <pre className="whitespace-pre-wrap text-sm font-mono overflow-x-auto">
              {searchTerm ? (
                <span dangerouslySetInnerHTML={{ __html: formatContent(content) }} />
              ) : (
                content
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export const CrawlDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [crawl, setCrawl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rerunning, setRerunning] = useState(false);

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



  const handleRerun = async () => {
    if (!crawl) return;
    
    try {
      setRerunning(true);
      
      // Extract the original prompt from metadata
      const metadata = typeof crawl.metadata === 'string' 
        ? JSON.parse(crawl.metadata) 
        : crawl.metadata || {};
      
      const payload = {
        url: crawl.url,
        prompt: metadata.extractionPrompt || ""
      };

      const res = await fetch(`${apiBase}/crawl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to rerun crawl: ${res.status}`);
      }

      const result = await res.json();
      
      if (result.success) {
        // Navigate to the new crawl result
        navigate(`/crawl/${result.id}`);
      } else {
        throw new Error(result.error || "Crawl failed");
      }
    } catch (error) {
      console.error("Failed to rerun crawl:", error);
      setError(`Failed to rerun crawl: ${error.message}`);
    } finally {
      setRerunning(false);
    }
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
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRerun}
            disabled={rerunning}
          >
            <RotateCcw className={`mr-2 h-4 w-4 ${rerunning ? 'animate-spin' : ''}`} />
            {rerunning ? 'Rerunning...' : 'Rerun'}
          </Button>
          <Badge variant={crawl.status === "success" ? "default" : "destructive"}>
            {crawl.status}
          </Badge>
        </div>
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
              {metadata.extractionPrompt && (
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Extraction Prompt</Label>
                  <div className="bg-muted/50 p-3 rounded-md mt-1">
                    <p className="text-sm font-mono">{metadata.extractionPrompt}</p>
                  </div>
                </div>
              )}
              {metadata.crawlMethod && (
                <div>
                  <Label className="text-sm font-medium">Crawl Method</Label>
                  <p className="text-sm mt-1">{metadata.crawlMethod}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Analysis */}
      {crawl.content && (
        <ContentAnalysis content={crawl.content} metadata={metadata} />
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
            <ContentRenderer content={crawl.content} />
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