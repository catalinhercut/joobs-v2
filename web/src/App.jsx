import React from "react";
import { Routes, Route } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { HomePage } from "./pages/HomePage";
import { CrawlDetailPage } from "./pages/CrawlDetailPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ConfigPage } from "./pages/ConfigPage";

export const App = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/crawl/:id" element={<CrawlDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/config" element={<ConfigPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;