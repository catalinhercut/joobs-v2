import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { ArrowLeft, Settings, Zap, CheckCircle, AlertCircle, TestTube } from "lucide-react";

export const ConfigPage = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  const crawl4aiBase = import.meta.env.VITE_CRAWL4AI_BASE_URL || "http://localhost:4000";

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${crawl4aiBase}/ai/config`);
      
      if (!res.ok) {
        throw new Error(`Failed to load config: ${res.status}`);
      }
      
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to load AI config:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const testAI = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      
      const res = await fetch(`${crawl4aiBase}/ai/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "Extract all contact information including emails, phone numbers, and prices"
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      console.error("AI test failed:", error);
      setTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setTesting(false);
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
          <p className="text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
            <CardTitle className="text-red-600">Configuration Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getProviderInfo = (provider) => {
    const providers = {
      openai: {
        name: "OpenAI",
        description: "GPT models from OpenAI",
        website: "https://platform.openai.com/",
        models: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview"]
      },
      anthropic: {
        name: "Anthropic",
        description: "Claude models from Anthropic",
        website: "https://console.anthropic.com/",
        models: ["claude-3-haiku-20240307", "claude-3-sonnet-20240229", "claude-3-opus-20240229"]
      },
      ollama: {
        name: "Ollama",
        description: "Local AI models via Ollama",
        website: "https://ollama.ai/",
        models: ["llama2", "codellama", "mistral", "neural-chat"]
      }
    };
    return providers[provider] || { name: provider, description: "Unknown provider" };
  };

  const providerInfo = getProviderInfo(config?.provider);

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
            <h1 className="text-2xl font-bold">AI Configuration</h1>
            <p className="text-muted-foreground">Configure AI-powered content extraction</p>
          </div>
        </div>
        <Button onClick={testAI} disabled={testing}>
          <TestTube className={`mr-2 h-4 w-4 ${testing ? 'animate-pulse' : ''}`} />
          {testing ? 'Testing...' : 'Test AI'}
        </Button>
      </div>

      {/* Current Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Current Configuration
          </CardTitle>
          <CardDescription>
            AI extraction settings for the crawl4ai service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="mt-1">
                <Badge variant={config?.enabled ? "default" : "secondary"} className="flex items-center w-fit">
                  {config?.enabled ? (
                    <>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Disabled
                    </>
                  )}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Provider</Label>
              <div className="mt-1">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{providerInfo.name}</Badge>
                  <span className="text-sm text-muted-foreground">{providerInfo.description}</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Model</Label>
              <p className="text-sm mt-1 font-mono">{config?.model}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">API Key</Label>
              <div className="mt-1">
                <Badge variant={config?.hasApiKey ? "default" : "destructive"}>
                  {config?.hasApiKey ? "Configured" : "Not Set"}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Max Tokens</Label>
              <p className="text-sm mt-1">{config?.maxTokens?.toLocaleString()}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Temperature</Label>
              <p className="text-sm mt-1">{config?.temperature}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TestTube className="mr-2 h-5 w-5" />
              Test Results
            </CardTitle>
            <CardDescription>
              AI extraction test with sample content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Success
                    </>
                  ) : (
                    <>
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Failed
                    </>
                  )}
                </Badge>
                {testResult.config && (
                  <span className="text-sm text-muted-foreground">
                    {testResult.config.provider} - {testResult.config.model}
                  </span>
                )}
              </div>

              {testResult.success ? (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">Extracted Content</Label>
                  <pre className="whitespace-pre-wrap text-sm">
                    {testResult.result}
                  </pre>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <Label className="text-sm font-medium mb-2 block text-red-600">Error</Label>
                  <p className="text-sm text-red-600">{testResult.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="mr-2 h-5 w-5" />
            Configuration Instructions
          </CardTitle>
          <CardDescription>
            How to configure AI providers for better content extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries({
              openai: {
                name: "OpenAI",
                steps: [
                  "Visit platform.openai.com",
                  "Create an account or sign in",
                  "Go to API Keys section",
                  "Create a new API key",
                  "Add OPENAI_API_KEY to .env file"
                ]
              },
              anthropic: {
                name: "Anthropic",
                steps: [
                  "Visit console.anthropic.com",
                  "Create an account or sign in",
                  "Go to API Keys section",
                  "Create a new API key",
                  "Add ANTHROPIC_API_KEY to .env file"
                ]
              },
              ollama: {
                name: "Ollama (Local)",
                steps: [
                  "Install Ollama locally",
                  "Run 'ollama pull llama2'",
                  "Start Ollama service",
                  "Set AI_PROVIDER=ollama in .env",
                  "No API key required"
                ]
              }
            }).map(([key, provider]) => (
              <div key={key} className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">{provider.name}</h4>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  {provider.steps.map((step, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-2 text-xs bg-muted rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">Environment Variables</h4>
            <div className="text-sm space-y-1 font-mono text-blue-700 dark:text-blue-300">
              <div>AI_PROVIDER=openai|anthropic|ollama</div>
              <div>AI_MODEL=gpt-3.5-turbo|claude-3-haiku-20240307|llama2</div>
              <div>AI_MAX_TOKENS=2000</div>
              <div>AI_TEMPERATURE=0.1</div>
              <div>OPENAI_API_KEY=sk-your-key-here</div>
              <div>ANTHROPIC_API_KEY=sk-ant-your-key-here</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};