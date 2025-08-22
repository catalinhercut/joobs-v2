import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Globe, History, Home, Settings } from "lucide-react";

export const Navigation = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="h-6 w-6" />
            <span className="text-xl font-bold">Web Crawler</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/" className="flex items-center space-x-2">
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>
            </Button>
            
            <Button
              variant={isActive("/history") ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/history" className="flex items-center space-x-2">
                <History className="h-4 w-4" />
                <span>History</span>
              </Link>
            </Button>
            
            <Button
              variant={isActive("/config") ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/config" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Config</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};