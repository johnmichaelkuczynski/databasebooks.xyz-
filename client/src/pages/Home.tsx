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
import { analyzeText, AnalysisResult } from "@/lib/llm";

type LLM = "grok" | "openai" | "anthropic" | "perplexity" | "deepseek";

export default function Home() {
  const [text, setText] = useState("");
  const [selectedLLM, setSelectedLLM] = useState<LLM>("grok");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  const { toast } = useToast();

  const handleProcess = async () => {
    if (!text.trim()) {
      toast({
        title: "Input required",
        description: "Please enter some text or upload a file to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setHasResult(false);
    
    try {
      const analysis = await analyzeText(text, selectedLLM);
      setResult(analysis);
      setHasResult(true);
      toast({
        title: "Analysis Complete",
        description: `Generated results using ${selectedLLM.toUpperCase()}.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
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
    if (file) {
      // Check if it's a text file or similar
      if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setText(content);
          toast({
            title: "File Uploaded",
            description: `${file.name} loaded successfully (${content.split(/\s+/).length} words).`,
          });
        };
        reader.onerror = () => {
          toast({
            title: "Error reading file",
            description: "Could not read the text content.",
            variant: "destructive",
          });
        };
        reader.readAsText(file);
      } else {
        // Fallback for binary files we can't parse client-side yet
        setText(`[Loaded content from ${file.name}]\n\n` + 
          "Note: This prototype currently supports full text extraction for .txt and .md files. For PDF and Word documents, this is a placeholder simulation.\n\n" + 
          "Please upload a plain text file to see the full analysis capabilities, or paste your text directly here.");
        toast({
          title: "File Format Warning",
          description: "Full extraction is currently limited to plain text files (.txt, .md).",
          variant: "destructive",
        });
      }
    }
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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary">
      {/* Header */}
      <header className="border-b-2 border-border sticky top-0 z-50 bg-background shadow-md">
        <div className="container mx-auto px-3 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary text-primary-foreground rounded flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-base tracking-tight">Text Intelligence Studio</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-foreground bg-secondary px-2.5 py-1 rounded-md border border-border">
              <Bot className="w-4 h-4 text-primary" />
              <Select value={selectedLLM} onValueChange={(v) => setSelectedLLM(v as LLM)}>
                <SelectTrigger className="h-6 w-[120px] border-none bg-transparent focus:ring-0 p-0 text-foreground font-semibold" data-testid="select-llm">
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

      <main className="container mx-auto px-2 py-3 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[calc(100vh-4.5rem)]">
          
          {/* Input Section */}
          <section className="flex flex-col gap-2 h-full">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-primary flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Input Document
              </h2>
              <div className="flex gap-1.5">
                {text && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
                    onClick={handleClearInput}
                    title="Clear Input"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs gap-1.5"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </Button>
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  accept=".txt,.doc,.docx,.pdf"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </div>
            </div>

            <Card 
              className={`flex-1 p-2 flex flex-col gap-2 border-2 shadow-lg relative group overflow-hidden transition-all duration-200 ${isDragging ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border'}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <Textarea 
                placeholder="Enter text, paste content, or upload a document to begin analysis..." 
                className="flex-1 resize-none border-none focus-visible:ring-0 p-3 text-base leading-relaxed font-serif bg-transparent"
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

              <div className="flex justify-between items-center pt-2 border-t-2 border-border">
                <span className="text-xs font-mono font-semibold text-muted-foreground">
                  {text.split(/\s+/).filter(Boolean).length} words
                </span>
                <Button 
                  onClick={handleProcess} 
                  disabled={isProcessing || !text}
                  className="h-8 font-bold"
                  data-testid="button-process"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span> Processing...
                    </>
                  ) : (
                    <>
                      Analyze <ChevronRight className="ml-1.5 w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </section>

          {/* Output Section */}
          <section className="flex flex-col gap-2 h-full">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-primary flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Analysis Results
              </h2>
              {hasResult && (
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-muted-foreground hover:text-destructive" 
                    title="Clear Results"
                    onClick={handleClearOutput}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy All" onClick={handleCopy}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Download Report" onClick={handleDownload}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
                {!hasResult || !result ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-secondary/30 p-6 text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Bot className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-base font-bold mb-1.5 text-foreground">Ready to Analyze</h3>
                    <p className="max-w-xs text-xs">
                      Select your LLM and submit text to generate quotes, summaries, and database.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full"
                  >
                    <Card className="h-full border-2 border-border shadow-lg overflow-hidden flex flex-col">
                      <Tabs defaultValue="quotes-list" className="w-full h-full flex flex-col">
                        <div className="border-b-2 border-border px-2 bg-secondary/50">
                          <TabsList className="h-9 bg-transparent p-0 gap-4">
                            <TabTrigger value="quotes-list" icon={<Quote className="w-4 h-4" />} label="Quotes" />
                            <TabTrigger value="quotes-context" icon={<AlignLeft className="w-4 h-4" />} label="Context" />
                            <TabTrigger value="summary" icon={<FileText className="w-4 h-4" />} label="Rewrite" />
                            <TabTrigger value="database" icon={<Database className="w-4 h-4" />} label="Database" />
                          </TabsList>
                        </div>

                        <div className="flex-1 bg-card">
                          <ScrollArea className="h-full">
                            <div className="p-3">
                              <TabsContent value="quotes-list" className="mt-0 space-y-3 outline-none">
                                <ul className="space-y-2.5">
                                  {result.quotes.map((quote, i) => (
                                    <li key={i} className="flex gap-2.5 group p-2 rounded hover:bg-secondary/50 transition-colors">
                                      <span className="flex-none w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold mt-0.5">
                                        {i + 1}
                                      </span>
                                      <p className="font-serif text-base leading-snug text-foreground">
                                        "{quote}"
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              </TabsContent>

                              <TabsContent value="quotes-context" className="mt-0 space-y-4 outline-none">
                                <div className="space-y-4">
                                  {result.annotatedQuotes.map((item, i) => (
                                    <div key={i} className="group p-2.5 rounded border-2 border-border hover:border-primary/50 transition-colors bg-card">
                                      <blockquote className="font-serif text-base text-foreground border-l-4 border-primary pl-3 py-1 mb-2">
                                        "{item.quote}"
                                      </blockquote>
                                      <div className="flex items-start gap-2 pl-4 text-xs text-muted-foreground font-medium">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                                        <p>{item.context}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>

                              <TabsContent value="summary" className="mt-0 space-y-3 outline-none">
                                <div className="p-3 bg-secondary/30 rounded-lg border-2 border-border">
                                  <p className="text-base leading-relaxed font-serif text-foreground">
                                    {result.summary}
                                  </p>
                                </div>
                              </TabsContent>

                              <TabsContent value="database" className="mt-0 outline-none h-full">
                                <div className="bg-secondary/50 rounded-lg p-3 border-2 border-border overflow-x-auto">
                                  <pre className="font-mono text-xs text-foreground leading-relaxed">
                                    {result.database}
                                  </pre>
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
        </div>
      </main>
    </div>
  );
}

function TabTrigger({ value, icon, label }: { value: string, icon: React.ReactNode, label: string }) {
  return (
    <TabsTrigger 
      value={value}
      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors gap-2"
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