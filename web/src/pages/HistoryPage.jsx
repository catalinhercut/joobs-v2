import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Search, ExternalLink, Calendar, FileText, ChevronLeft, ChevronRight } from "lucide-react";

export const HistoryPage = () => {
  const [crawls, setCrawls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredCrawls, setFilteredCrawls] = useState([]);

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
  const itemsPerPage = 10;

  useEffect(() => {
    loadCrawls();
  }, []);

  useEffect(() => {
    filterCrawls();
  }, [crawls, searchTerm, currentPage]);

  const loadCrawls = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/crawl/results?limit=1000`);
      const data = await res.json();
      setCrawls(data.results || []);
    } catch (error) {
      console.error("Failed to load crawls:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterCrawls = () => {
    let filtered = crawls;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = crawls.filter(
        (crawl) =>
          crawl.title?.toLowerCase().includes(term) ||
          crawl.url?.toLowerCase().includes(term) ||
          crawl.content?.toLowerCase().includes(term)
      );
    }

    const total = Math.ceil(filtered.length / itemsPerPage);
    setTotalPages(total);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setFilteredCrawls(filtered.slice(startIndex, endIndex));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Crawl History</h1>
          <p className="text-muted-foreground mt-2">Loading your crawling history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Crawl History</h1>
        <p className="text-muted-foreground mt-2">
          Browse and search through all your crawled websites
        </p>
      </div>

      {/* Search and Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Search & Filter</span>
            <Badge variant="outline">
              {crawls.length} total crawls
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, URL, or content..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="flex-1"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {filteredCrawls.length} results for "{searchTerm}"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {filteredCrawls.length === 0 && searchTerm
              ? "No crawls match your search criteria"
              : `Showing ${filteredCrawls.length} of ${crawls.length} crawls`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCrawls.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? "No results found" : "No crawls yet"}
              </p>
              {!searchTerm && (
                <Button asChild className="mt-4">
                  <Link to="/">Start Crawling</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCrawls.map((crawl) => (
                <div
                  key={crawl.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium truncate">
                        {crawl.title || "Untitled"}
                      </h3>
                      <Badge variant={crawl.status === "success" ? "default" : "destructive"}>
                        {crawl.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate">
                      {crawl.url}
                    </p>
                    
                    {crawl.content && (
                      <p className="text-sm text-muted-foreground">
                        {truncateText(crawl.content, 150)}
                      </p>
                    )}
                    
                    <div className="flex items-center text-xs text-muted-foreground space-x-4">
                      <span className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        {formatDate(crawl.crawled_at)}
                      </span>
                      {crawl.content && (
                        <span>{crawl.content.length} characters</span>
                      )}
                      <span>ID: {crawl.id}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={crawl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open original URL"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};