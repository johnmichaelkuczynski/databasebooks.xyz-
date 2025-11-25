import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileText, 
  Maximize2, 
  Minimize2, 
  ChevronRight, 
  Sparkles,
  Quote,
  AlignLeft,
  Database,
  Bot,
  Check,
  Download,
  Copy,
  Trash2,
  RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { analyzeText, analyzeTextStreaming, AnalysisResult } from "@/lib/llm";

type LLM = "grok" | "openai" | "anthropic" | "perplexity" | "deepseek";

export default function Home() {
  const [text, setText] = useState("");
  const [selectedLLM, setSelectedLLM] = useState<LLM>("grok");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [streamingOutput, setStreamingOutput] = useState("");
  
  const { toast } = useToast();

  const handleProcess = async (functionType: 'quotes' | 'context' | 'rewrite' | 'database' | 'analyzer') => {
    if (!text.trim()) {
      toast({
        title: "Input required",
        description: "Please enter some text or upload a file to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setHasResult(true); // Show streaming immediately
    setStreamingOutput("");
    let accumulatedOutput = "";
    
    try {
      await analyzeTextStreaming(
        text, 
        selectedLLM, 
        functionType,
        (chunk: string) => {
          accumulatedOutput += chunk;
          setStreamingOutput(accumulatedOutput);
        },
        () => {
          // Parse final JSON when streaming completes
          try {
            const parsed = JSON.parse(accumulatedOutput);
            console.log("Parsed result:", parsed);
            console.log("Analyzer field length:", parsed.analyzer?.length || 0);
            console.log("Analyzer field preview:", parsed.analyzer?.substring(0, 100) || "(empty)");
            setResult(parsed);
            toast({
              title: "Analysis Complete",
              description: `Generated ${functionType} using ${selectedLLM.toUpperCase()}.`,
            });
          } catch (e) {
            console.error("Failed to parse streaming output:", e);
            console.error("Accumulated output length:", accumulatedOutput.length);
            console.error("First 500 chars:", accumulatedOutput.substring(0, 500));
          }
        }
      );
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
      setHasResult(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearInput = () => {
    setText("");
    toast({ description: "Input cleared" });
  };

  const handleClearOutput = () => {
    setHasResult(false);
    setResult(null);
    toast({ description: "Results cleared" });
  };

  const generateReportContent = () => {
    if (!result) return "";
    return `TEXT INTELLIGENCE REPORT
Generated: ${new Date().toLocaleString()}
Source Length: ${text.split(/\s+/).filter(Boolean).length} words
LLM Used: ${selectedLLM}

--- KEY QUOTATIONS ---
${result.quotes.map((q, i) => `${i+1}. ${q}`).join('\n')}

--- ANNOTATED CITATIONS ---
${result.annotatedQuotes.map((q, i) => `"${q.quote}"\n   > Context: ${q.context}`).join('\n\n')}

--- COMPRESSED REWRITE ---
${result.summary}

--- DATABASE ---
${result.database}

--- TEXT ANALYZER ---
${result.analyzer}
`;
  };

  const handleDownload = () => {
    const content = generateReportContent();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-report-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ 
      title: "Download Started", 
      description: "Your analysis report has been saved." 
    });
  };

  const handleCopy = () => {
    const content = generateReportContent();
    navigator.clipboard.writeText(content).then(() => {
      toast({ 
        title: "Copied to Clipboard", 
        description: "Full report copied successfully." 
      });
    });
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    
    // Accept any text-based file
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content);
      toast({
        title: "File Uploaded",
        description: `${file.name} loaded (${content.split(/\s+/).filter(Boolean).length} words)`,
      });
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Could not read file",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white">
      {/* Header */}
      <header className="border-b-4 border-primary sticky top-0 z-50 bg-white shadow-lg">
        <div className="w-full px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary text-white rounded-lg flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="font-bold text-2xl tracking-tight text-foreground">TEXT INTELLIGENCE STUDIO</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-base text-foreground bg-gray-100 border-2 border-gray-300 px-5 py-2.5 rounded-lg shadow-md">
              <Bot className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">LLM:</span>
              <Select value={selectedLLM} onValueChange={(v) => setSelectedLLM(v as LLM)}>
                <SelectTrigger className="h-8 w-[140px] border-none bg-transparent focus:ring-0 p-0 text-foreground font-bold uppercase" data-testid="select-llm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grok">Grok</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-10 py-6">
        <ResizablePanelGroup direction="horizontal" className="gap-8" style={{minHeight: 'calc(100vh - 6rem)'}}>
          <ResizablePanel defaultSize={50} minSize={30}>
          {/* Input Section */}
          <section className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-primary flex items-center gap-2.5 uppercase tracking-wide">
                <FileText className="w-6 h-6" />
                Input Document
              </h2>
              <div className="flex gap-2">
                {text && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 text-sm gap-2 text-muted-foreground hover:text-destructive transition-all"
                    onClick={handleClearInput}
                    title="Clear Input"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-10 text-sm gap-2 border-2 border-gray-300 hover:bg-gray-100 transition-all"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  accept=".txt,.doc,.docx,.pdf,*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </div>
            </div>

            <Card 
              className={`flex-1 p-6 flex flex-col gap-4 border-4 bg-white relative group overflow-hidden transition-all duration-300 shadow-xl ${isDragging ? 'border-primary ring-4 ring-primary/20' : 'border-gray-300'}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              style={{minHeight: 'calc(100vh - 20rem)'}}
            >
              <Textarea 
                placeholder="Enter text, paste content, or drag files here to begin analysis..." 
                className="flex-1 resize-none border-none focus-visible:ring-0 p-6 text-xl leading-relaxed font-serif bg-transparent placeholder:text-gray-400"
                value={text}
                onChange={(e) => setText(e.target.value)}
                data-testid="input-text"
              />
              
              {/* Empty State / Dropzone Hint */}
              {!text && (
                <div className={`absolute inset-0 pointer-events-none flex items-center justify-center transition-opacity duration-200 ${isDragging ? 'opacity-80' : 'opacity-20'}`}>
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={isDragging ? { scale: 1.1, y: -10 } : { scale: 1, y: 0 }}
                    >
                      {isDragging ? (
                        <Upload className="w-16 h-16 text-primary" />
                      ) : (
                        <FileText className="w-16 h-16" />
                      )}
                    </motion.div>
                    <p className="text-lg font-medium">
                      {isDragging ? "Drop file to upload" : "Drop files here or start typing"}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Overlay for Drag State when text exists */}
              {text && isDragging && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-10 border-2 border-dashed border-primary m-2 rounded-lg">
                  <div className="flex flex-col items-center gap-4 text-primary">
                    <Upload className="w-16 h-16" />
                    <p className="text-lg font-medium">Drop file to replace content</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 pt-4 border-t-4 border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-base font-mono font-bold text-primary uppercase tracking-widest bg-blue-100 px-4 py-2 rounded-lg border-2 border-primary">
                    {text.split(/\s+/).filter(Boolean).length} WORDS
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => handleProcess('quotes')} 
                    disabled={isProcessing || !text}
                    className="h-12 text-sm font-semibold px-5 bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg transition-all hover:scale-105"
                    data-testid="button-quotes"
                  >
                    <Quote className="w-5 h-5 mr-2" />
                    QUOTES
                  </Button>
                  <Button 
                    onClick={() => handleProcess('context')} 
                    disabled={isProcessing || !text}
                    className="h-12 text-sm font-semibold px-5 bg-gradient-to-r from-secondary to-accent text-white hover:shadow-lg transition-all hover:scale-105"
                    data-testid="button-context"
                  >
                    <AlignLeft className="w-5 h-5 mr-2" />
                    CONTEXT
                  </Button>
                  <Button 
                    onClick={() => handleProcess('rewrite')} 
                    disabled={isProcessing || !text}
                    className="h-12 text-sm font-semibold px-5 bg-gradient-to-r from-accent to-primary text-white hover:shadow-lg transition-all hover:scale-105"
                    data-testid="button-rewrite"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    REWRITE
                  </Button>
                  <Button 
                    onClick={() => handleProcess('database')} 
                    disabled={isProcessing || !text}
                    className="h-12 text-sm font-semibold px-5 bg-gradient-to-r from-primary via-secondary to-accent text-white hover:shadow-lg transition-all hover:scale-105"
                    data-testid="button-database"
                  >
                    <Database className="w-5 h-5 mr-2" />
                    DATABASE
                  </Button>
                  <Button 
                    onClick={() => handleProcess('analyzer')} 
                    disabled={isProcessing || !text}
                    className="col-span-2 h-12 text-sm font-semibold px-5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white hover:shadow-lg transition-all hover:scale-105"
                    data-testid="button-analyzer"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    TEXT ANALYZER
                  </Button>
                </div>
              </div>
            </Card>
          </section>
          </ResizablePanel>
          
          <ResizableHandle withHandle className="mx-4" />
          
          <ResizablePanel defaultSize={50} minSize={30}>
          {/* Output Section */}
          <section className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-secondary flex items-center gap-2.5 uppercase tracking-wide">
                <Sparkles className="w-6 h-6" />
                Analysis Results
              </h2>
              {hasResult && (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-muted-foreground hover:text-destructive transition-all" 
                    title="Clear Results"
                    onClick={handleClearOutput}
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-gray-100 transition-all" title="Copy All" onClick={handleCopy}>
                    <Copy className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-gray-100 transition-all" title="Download Report" onClick={handleDownload}>
                    <Download className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1">
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-4 border-primary rounded-lg flex flex-col bg-white p-8 shadow-xl"
                    style={{minHeight: 'calc(100vh - 20rem)'}}
                  >
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-gray-200">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-primary uppercase tracking-wide">Processing Analysis</h3>
                        <p className="text-base text-muted-foreground mt-1">Using {selectedLLM.toUpperCase()} • Streaming output in real-time</p>
                      </div>
                    </div>
                    
                    <div className="flex-1 bg-gray-50 rounded-lg border-2 border-gray-200 p-6 overflow-auto">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                        <span className="text-sm font-semibold text-primary">Live Output</span>
                      </div>
                      <pre className="font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {streamingOutput || "Initializing connection..."}
                      </pre>
                    </div>
                  </motion.div>
                ) : !hasResult || !result ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-4 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-gray-50 p-8 text-center shadow-xl"
                    style={{minHeight: 'calc(100vh - 20rem)'}}
                  >
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-5 shadow-lg">
                      <Bot className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-foreground uppercase tracking-wide">Ready to Analyze</h3>
                    <p className="max-w-md text-base text-muted-foreground">
                      Select your LLM and click a function button to generate quotes, context, rewrites, or database metadata.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full"
                  >
                    <Card className="border-4 border-gray-300 bg-white shadow-xl overflow-hidden flex flex-col" style={{minHeight: 'calc(100vh - 20rem)'}}>
                      <Tabs defaultValue="quotes-list" className="w-full h-full flex flex-col">
                        <div className="border-b-4 border-gray-200 px-6 bg-gray-50">
                          <TabsList className="h-12 bg-transparent p-0 gap-6">
                            <TabTrigger value="quotes-list" icon={<Quote className="w-5 h-5" />} label="Quotes" />
                            <TabTrigger value="quotes-context" icon={<AlignLeft className="w-5 h-5" />} label="Context" />
                            <TabTrigger value="summary" icon={<FileText className="w-5 h-5" />} label="Rewrite" />
                            <TabTrigger value="database" icon={<Database className="w-5 h-5" />} label="Database" />
                            <TabTrigger value="analyzer" icon={<Sparkles className="w-5 h-5" />} label="Analyzer" />
                          </TabsList>
                        </div>

                        <div className="flex-1 bg-card">
                          <ScrollArea className="h-full">
                            <div className="p-6">
                              <TabsContent value="quotes-list" className="mt-0 space-y-4 outline-none">
                                <ul className="space-y-4">
                                  {result.quotes.map((quote, i) => (
                                    <li key={i} className="flex gap-4 group p-4 rounded-lg hover:bg-blue-50 transition-all border-2 border-gray-200 hover:border-primary hover:shadow-md">
                                      <span className="flex-none w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-base font-bold shadow-md">
                                        {i + 1}
                                      </span>
                                      <p className="font-serif text-lg leading-relaxed text-foreground">
                                        "{quote}"
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              </TabsContent>

                              <TabsContent value="quotes-context" className="mt-0 space-y-5 outline-none">
                                <div className="space-y-5">
                                  {result.annotatedQuotes.map((item, i) => (
                                    <div key={i} className="group p-5 rounded-lg border-2 border-gray-200 hover:border-secondary transition-all bg-gray-50 hover:shadow-lg">
                                      <blockquote className="font-serif text-lg text-foreground border-l-4 border-secondary pl-5 py-2 mb-3">
                                        "{item.quote}"
                                      </blockquote>
                                      <div className="flex items-start gap-3 pl-5 text-base text-gray-700 font-medium">
                                        <span className="mt-2 w-2 h-2 rounded-full bg-accent shrink-0" />
                                        <p>{item.context}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>

                              <TabsContent value="summary" className="mt-0 space-y-4 outline-none">
                                <div className="p-6 bg-gray-50 rounded-lg border-2 border-gray-200 shadow-lg">
                                  <p className="text-lg leading-relaxed font-serif text-foreground">
                                    {result.summary}
                                  </p>
                                </div>
                              </TabsContent>

                              <TabsContent value="database" className="mt-0 outline-none h-full">
                                <div className="bg-gray-900 rounded-lg p-6 border-2 border-gray-200 overflow-x-auto shadow-lg">
                                  <pre className="font-mono text-sm text-gray-100 leading-relaxed">
                                    {result.database}
                                  </pre>
                                </div>
                              </TabsContent>

                              <TabsContent value="analyzer" className="mt-0 outline-none h-full">
                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200 shadow-lg">
                                  {result.analyzer ? (
                                    <pre className="font-sans text-base text-foreground whitespace-pre-wrap leading-relaxed">
                                      {result.analyzer}
                                    </pre>
                                  ) : (
                                    <div className="text-center py-12">
                                      <p className="text-lg text-muted-foreground">
                                        No analysis data available. The analyzer field appears to be empty.
                                      </p>
                                      <p className="text-sm text-muted-foreground mt-2">
                                        Debug: Result keys: {Object.keys(result).join(', ')}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </TabsContent>
                            </div>
                          </ScrollArea>
                        </div>
                      </Tabs>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}

function TabTrigger({ value, icon, label }: { value: string, icon: React.ReactNode, label: string }) {
  return (
    <TabsTrigger 
      value={value}
      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none h-full px-0 data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-all gap-2.5 text-base font-bold uppercase tracking-wide"
    >
      {icon}
      {label}
    </TabsTrigger>
  );
}

function Header({ title, subtitle }: { title: string, subtitle: string }) {
  return (
    <div className="pb-4 border-b mb-6">
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}