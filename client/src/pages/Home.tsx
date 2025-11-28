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
  RotateCcw,
  Layers,
  CheckSquare,
  Square,
  Play,
  ChevronDown,
  ChevronUp,
  User,
  LogIn,
  LogOut,
  BarChart3,
  BookOpen,
  Save,
  X,
  GitCompare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { analyzeText, analyzeTextStreaming, AnalysisResult } from "@/lib/llm";

type LLM = "grok" | "openai" | "anthropic" | "perplexity" | "deepseek";

interface Chunk {
  id: number;
  text: string;
  wordCount: number;
  startWord: number;
  endWord: number;
  selected: boolean;
}

interface StylometricAuthor {
  id: number;
  authorName: string;
  sourceTitle?: string;
  wordCount?: number;
  verticalityScore?: string;
  rawFeatures?: any;
  fullReport?: string;
}

const CHUNK_SIZE = 1000;

function splitIntoChunks(text: string): Chunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: Chunk[] = [];
  
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    const chunkWords = words.slice(i, i + CHUNK_SIZE);
    chunks.push({
      id: chunks.length + 1,
      text: chunkWords.join(' '),
      wordCount: chunkWords.length,
      startWord: i + 1,
      endWord: Math.min(i + CHUNK_SIZE, words.length),
      selected: true
    });
  }
  
  return chunks;
}

function combineResults(results: AnalysisResult[]): AnalysisResult {
  return {
    quotes: results.flatMap(r => r.quotes),
    annotatedQuotes: results.flatMap(r => r.annotatedQuotes),
    summary: results.map((r, i) => `[Chunk ${i + 1}]\n${r.summary}`).join('\n\n'),
    database: results.map((r, i) => `═══ CHUNK ${i + 1} ═══\n${r.database}`).join('\n\n'),
    analyzer: results.map((r, i) => `═══════════════════════════════════════\n           CHUNK ${i + 1} ANALYSIS\n═══════════════════════════════════════\n\n${r.analyzer}`).join('\n\n')
  };
}

export default function Home() {
  const [text, setText] = useState("");
  const [selectedLLM, setSelectedLLM] = useState<LLM>("grok");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [streamingOutput, setStreamingOutput] = useState("");
  
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [showChunkSelector, setShowChunkSelector] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [totalChunksToProcess, setTotalChunksToProcess] = useState(0);
  const [chunkResults, setChunkResults] = useState<AnalysisResult[]>([]);
  
  const [username, setUsername] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState("");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [showStylometricsDialog, setShowStylometricsDialog] = useState(false);
  const [stylometricsTab, setStylometricsTab] = useState<"single" | "compare">("single");
  const [stylometricsAuthorName, setStylometricsAuthorName] = useState("");
  const [stylometricsSourceTitle, setStylometricsSourceTitle] = useState("");
  const [stylometricsText, setStylometricsText] = useState("");
  const [stylometricsTextB, setStylometricsTextB] = useState("");
  const [stylometricsAuthorNameB, setStylometricsAuthorNameB] = useState("");
  const [stylometricsReport, setStylometricsReport] = useState("");
  const [stylometricsData, setStylometricsData] = useState<any>(null);
  const [isAnalyzingStylometrics, setIsAnalyzingStylometrics] = useState(false);
  const [savedAuthors, setSavedAuthors] = useState<StylometricAuthor[]>([]);
  
  const { toast } = useToast();
  
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const needsChunking = wordCount > CHUNK_SIZE;
  
  useEffect(() => {
    const savedUsername = localStorage.getItem('tis_username');
    if (savedUsername) {
      setUsername(savedUsername);
      loadSavedAuthors(savedUsername);
    }
  }, []);
  
  useEffect(() => {
    if (needsChunking) {
      setChunks(splitIntoChunks(text));
      setShowChunkSelector(true);
    } else {
      setChunks([]);
      setShowChunkSelector(false);
    }
  }, [text, needsChunking]);

  const loadSavedAuthors = async (user: string) => {
    try {
      const response = await fetch(`/api/stylometrics/authors?username=${encodeURIComponent(user)}`);
      if (response.ok) {
        const data = await response.json();
        setSavedAuthors(data.authors || []);
      }
    } catch (error) {
      console.error("Failed to load authors:", error);
    }
  };

  const handleLogin = async () => {
    if (!loginInput.trim() || loginInput.trim().length < 2) {
      toast({
        title: "Invalid username",
        description: "Username must be at least 2 characters",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginInput.trim() })
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsername(data.user.username);
        localStorage.setItem('tis_username', data.user.username);
        setShowLoginDialog(false);
        setLoginInput("");
        loadSavedAuthors(data.user.username);
        toast({
          title: "Welcome!",
          description: `Logged in as ${data.user.username}`,
        });
      } else {
        throw new Error("Login failed");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setUsername(null);
    localStorage.removeItem('tis_username');
    setSavedAuthors([]);
    toast({ description: "Logged out successfully" });
  };

  const toggleChunk = (chunkId: number) => {
    setChunks(prev => prev.map(c => 
      c.id === chunkId ? { ...c, selected: !c.selected } : c
    ));
  };
  
  const selectAllChunks = () => {
    setChunks(prev => prev.map(c => ({ ...c, selected: true })));
  };
  
  const deselectAllChunks = () => {
    setChunks(prev => prev.map(c => ({ ...c, selected: false })));
  };
  
  const selectedChunks = chunks.filter(c => c.selected);

  const processChunk = async (chunkText: string, functionType: 'quotes' | 'context' | 'rewrite' | 'database' | 'analyzer'): Promise<AnalysisResult> => {
    return new Promise((resolve, reject) => {
      let accumulatedOutput = "";
      
      analyzeTextStreaming(
        chunkText,
        selectedLLM,
        functionType,
        (chunk: string) => {
          accumulatedOutput += chunk;
          setStreamingOutput(accumulatedOutput);
        },
        () => {
          try {
            const parsed = JSON.parse(accumulatedOutput);
            resolve(parsed);
          } catch (e) {
            resolve({
              quotes: [],
              annotatedQuotes: [],
              summary: accumulatedOutput.substring(0, 1000),
              database: accumulatedOutput,
              analyzer: accumulatedOutput
            });
          }
        }
      ).catch(reject);
    });
  };

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
    setHasResult(true);
    setStreamingOutput("");
    setChunkResults([]);
    
    try {
      if (needsChunking && selectedChunks.length > 0) {
        const chunksToProcess = selectedChunks;
        setTotalChunksToProcess(chunksToProcess.length);
        const results: AnalysisResult[] = [];
        
        for (let i = 0; i < chunksToProcess.length; i++) {
          setCurrentChunkIndex(i + 1);
          setStreamingOutput(`Processing chunk ${i + 1} of ${chunksToProcess.length}...\n\n`);
          
          toast({
            title: `Processing Chunk ${i + 1}/${chunksToProcess.length}`,
            description: `Words ${chunksToProcess[i].startWord}-${chunksToProcess[i].endWord}`,
          });
          
          const chunkResult = await processChunk(chunksToProcess[i].text, functionType);
          results.push(chunkResult);
          setChunkResults([...results]);
        }
        
        const combinedResult = combineResults(results);
        setResult(combinedResult);
        
        toast({
          title: "Analysis Complete",
          description: `Processed ${chunksToProcess.length} chunks using ${selectedLLM.toUpperCase()}.`,
        });
      } else {
        let accumulatedOutput = "";
        
        await analyzeTextStreaming(
          text, 
          selectedLLM, 
          functionType,
          (chunk: string) => {
            accumulatedOutput += chunk;
            setStreamingOutput(accumulatedOutput);
          },
          () => {
            try {
              const parsed = JSON.parse(accumulatedOutput);
              console.log("Parsed result:", parsed);
              setResult(parsed);
              toast({
                title: "Analysis Complete",
                description: `Generated ${functionType} using ${selectedLLM.toUpperCase()}.`,
              });
            } catch (e) {
              console.error("Failed to parse streaming output:", e);
            }
          }
        );
      }
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
      setCurrentChunkIndex(0);
      setTotalChunksToProcess(0);
    }
  };

  const handleStylometricsAnalyze = async () => {
    const textToAnalyze = stylometricsTab === "single" ? (stylometricsText || text) : stylometricsText;
    const authorName = stylometricsTab === "single" ? stylometricsAuthorName : stylometricsAuthorName;
    
    if (!textToAnalyze.trim()) {
      toast({
        title: "Text required",
        description: "Please enter text to analyze",
        variant: "destructive",
      });
      return;
    }
    
    if (!authorName.trim()) {
      toast({
        title: "Author name required",
        description: "Please enter an author name or label",
        variant: "destructive",
      });
      return;
    }
    
    const wordCount = textToAnalyze.split(/\s+/).filter(Boolean).length;
    if (wordCount < 400) {
      toast({
        title: "Text too short",
        description: `Need at least 400 words. Current: ${wordCount} words.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzingStylometrics(true);
    setStylometricsReport("");
    setStylometricsData(null);
    
    try {
      if (stylometricsTab === "single") {
        const response = await fetch('/api/stylometrics/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            authorName: stylometricsAuthorName,
            sourceTitle: stylometricsSourceTitle,
            text: textToAnalyze,
            provider: selectedLLM
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Analysis failed");
        }
        
        const data = await response.json();
        setStylometricsReport(data.report);
        setStylometricsData(data.data);
        
        toast({
          title: "Analysis Complete",
          description: `Verticality Score: ${data.data.verticalityScore?.toFixed(2) || 'N/A'}`,
        });
      } else {
        if (!stylometricsTextB.trim() || !stylometricsAuthorNameB.trim()) {
          toast({
            title: "Missing Text B",
            description: "Please provide both texts for comparison",
            variant: "destructive",
          });
          return;
        }
        
        const wordCountB = stylometricsTextB.split(/\s+/).filter(Boolean).length;
        if (wordCountB < 400) {
          toast({
            title: "Text B too short",
            description: `Need at least 400 words. Current: ${wordCountB} words.`,
            variant: "destructive",
          });
          return;
        }
        
        const response = await fetch('/api/stylometrics/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            textA: { text: stylometricsText, authorName: stylometricsAuthorName },
            textB: { text: stylometricsTextB, authorName: stylometricsAuthorNameB },
            provider: selectedLLM
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Comparison failed");
        }
        
        const data = await response.json();
        setStylometricsReport(data.report);
        setStylometricsData(data.data);
        
        toast({
          title: "Comparison Complete",
          description: `Verticality difference: ${data.data.comparison?.verticalityDifference?.toFixed(2) || 'N/A'}`,
        });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingStylometrics(false);
    }
  };

  const handleSaveStylometricProfile = async () => {
    if (!username) {
      toast({
        title: "Login required",
        description: "Please log in to save profiles",
        variant: "destructive",
      });
      return;
    }
    
    if (!stylometricsData || !stylometricsAuthorName) {
      toast({
        title: "No data to save",
        description: "Run an analysis first",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch('/api/stylometrics/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          authorName: stylometricsAuthorName,
          sourceTitle: stylometricsSourceTitle,
          data: stylometricsData,
          fullReport: stylometricsReport
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Save failed");
      }
      
      const data = await response.json();
      toast({
        title: data.message,
        description: `Saved profile for ${stylometricsAuthorName}`,
      });
      
      loadSavedAuthors(username);
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
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

  const openStylometricsWithText = () => {
    if (text.trim()) {
      setStylometricsText(text);
    }
    setShowStylometricsDialog(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white">
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
            
            {username ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm px-3 py-1.5 bg-green-100 text-green-800 border border-green-300">
                  <User className="w-4 h-4 mr-1" />
                  {username}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-8 text-muted-foreground hover:text-destructive"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 text-sm gap-2 border-2 border-primary text-primary hover:bg-primary hover:text-white"
                    data-testid="button-login"
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Login to Text Intelligence Studio
                    </DialogTitle>
                    <DialogDescription>
                      Enter a username to save your stylometric profiles and analysis history.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="Enter your username"
                        value={loginInput}
                        onChange={(e) => setLoginInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        data-testid="input-username"
                      />
                    </div>
                    <Button
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      className="w-full"
                      data-testid="button-submit-login"
                    >
                      {isLoggingIn ? "Logging in..." : "Continue"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-10 py-6">
        <ResizablePanelGroup direction="horizontal" className="gap-8" style={{minHeight: 'calc(100vh - 6rem)'}}>
          <ResizablePanel defaultSize={50} minSize={30}>
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
                    {wordCount} WORDS
                  </span>
                  {needsChunking && (
                    <Badge variant="secondary" className="text-sm px-3 py-1 bg-orange-100 text-orange-800 border border-orange-300">
                      <Layers className="w-4 h-4 mr-1" />
                      {chunks.length} Chunks
                    </Badge>
                  )}
                </div>
                
                {needsChunking && showChunkSelector && (
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border-2 border-orange-200 shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-orange-800 flex items-center gap-2">
                        <Layers className="w-5 h-5" />
                        Document Chunks
                      </h4>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={selectAllChunks}
                          className="h-7 text-xs text-orange-700 hover:text-orange-900 hover:bg-orange-100"
                        >
                          <CheckSquare className="w-3 h-3 mr-1" />
                          All
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={deselectAllChunks}
                          className="h-7 text-xs text-orange-700 hover:text-orange-900 hover:bg-orange-100"
                        >
                          <Square className="w-3 h-3 mr-1" />
                          None
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {chunks.map((chunk) => (
                        <div 
                          key={chunk.id}
                          onClick={() => toggleChunk(chunk.id)}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all ${
                            chunk.selected 
                              ? 'bg-orange-200 border-2 border-orange-400' 
                              : 'bg-white border-2 border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          <Checkbox 
                            checked={chunk.selected} 
                            onCheckedChange={() => toggleChunk(chunk.id)}
                            className="pointer-events-none"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">
                              Chunk {chunk.id}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              Words {chunk.startWord}-{chunk.endWord} ({chunk.wordCount})
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-orange-200 flex items-center justify-between text-sm">
                      <span className="text-orange-700">
                        {selectedChunks.length} of {chunks.length} chunks selected
                      </span>
                      {selectedChunks.length === 0 && (
                        <span className="text-red-600 text-xs">Select at least one chunk</span>
                      )}
                    </div>
                  </div>
                )}
                
                {isProcessing && totalChunksToProcess > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-blue-800">
                        Processing Chunk {currentChunkIndex} of {totalChunksToProcess}
                      </span>
                      <span className="text-sm text-blue-600">
                        {Math.round((currentChunkIndex / totalChunksToProcess) * 100)}%
                      </span>
                    </div>
                    <Progress value={(currentChunkIndex / totalChunksToProcess) * 100} className="h-2" />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => handleProcess('quotes')} 
                    disabled={isProcessing || !text || (needsChunking && selectedChunks.length === 0)}
                    className="h-12 text-sm font-semibold px-5 bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg transition-all hover:scale-105"
                    data-testid="button-quotes"
                  >
                    <Quote className="w-5 h-5 mr-2" />
                    QUOTES
                  </Button>
                  <Button 
                    onClick={() => handleProcess('context')} 
                    disabled={isProcessing || !text || (needsChunking && selectedChunks.length === 0)}
                    className="h-12 text-sm font-semibold px-5 bg-gradient-to-r from-secondary to-accent text-white hover:shadow-lg transition-all hover:scale-105"
                    data-testid="button-context"
                  >
                    <AlignLeft className="w-5 h-5 mr-2" />
                    CONTEXT
                  </Button>
                  <Button 
                    onClick={() => handleProcess('rewrite')} 
                    disabled={isProcessing || !text || (needsChunking && selectedChunks.length === 0)}
                    className="h-12 text-sm font-semibold px-5 bg-gradient-to-r from-accent to-primary text-white hover:shadow-lg transition-all hover:scale-105"
                    data-testid="button-rewrite"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    REWRITE
                  </Button>
                  <Button 
                    onClick={() => handleProcess('database')} 
                    disabled={isProcessing || !text || (needsChunking && selectedChunks.length === 0)}
                    className="h-12 text-sm font-semibold px-5 bg-gradient-to-r from-primary via-secondary to-accent text-white hover:shadow-lg transition-all hover:scale-105"
                    data-testid="button-database"
                  >
                    <Database className="w-5 h-5 mr-2" />
                    DATABASE
                  </Button>
                  <Button 
                    onClick={() => handleProcess('analyzer')} 
                    disabled={isProcessing || !text || (needsChunking && selectedChunks.length === 0)}
                    className="h-12 text-sm font-semibold px-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg transition-all hover:scale-105"
                    data-testid="button-analyzer"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    ANALYZER
                  </Button>
                  <Button 
                    onClick={openStylometricsWithText}
                    disabled={isProcessing}
                    className="h-12 text-sm font-semibold px-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg transition-all hover:scale-105"
                    data-testid="button-stylometrics"
                  >
                    <BarChart3 className="w-5 h-5 mr-2" />
                    STYLOMETRICS
                  </Button>
                </div>
              </div>
            </Card>
          </section>
          </ResizablePanel>
          
          <ResizableHandle withHandle className="mx-4" />
          
          <ResizablePanel defaultSize={50} minSize={30}>
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
                        <div className="border-b-4 border-gray-200 px-6 bg-gray-50 overflow-x-auto">
                          <TabsList className="h-14 bg-transparent p-0 gap-4 flex-nowrap min-w-max">
                            <TabTrigger value="quotes-list" icon={<Quote className="w-4 h-4" />} label="Quotes" />
                            <TabTrigger value="quotes-context" icon={<AlignLeft className="w-4 h-4" />} label="Context" />
                            <TabTrigger value="summary" icon={<FileText className="w-4 h-4" />} label="Rewrite" />
                            <TabTrigger value="database" icon={<Database className="w-4 h-4" />} label="Database" />
                            <TabTrigger value="analyzer" icon={<Sparkles className="w-4 h-4" />} label="Text Analyzer" />
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

      <Dialog open={showStylometricsDialog} onOpenChange={setShowStylometricsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
              Stylometric Analysis
            </DialogTitle>
            <DialogDescription>
              Analyze writing style, verticality, and psychological profile of text samples.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={stylometricsTab} onValueChange={(v) => setStylometricsTab(v as "single" | "compare")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Single Text
              </TabsTrigger>
              <TabsTrigger value="compare" className="gap-2">
                <GitCompare className="w-4 h-4" />
                Compare Texts
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="single" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="author-name">Author Name / Label *</Label>
                    <Input
                      id="author-name"
                      placeholder="e.g., John Smith"
                      value={stylometricsAuthorName}
                      onChange={(e) => setStylometricsAuthorName(e.target.value)}
                      data-testid="input-author-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source-title">Source Title (optional)</Label>
                    <Input
                      id="source-title"
                      placeholder="e.g., Essay on Knowledge"
                      value={stylometricsSourceTitle}
                      onChange={(e) => setStylometricsSourceTitle(e.target.value)}
                      data-testid="input-source-title"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="stylometrics-text">Text Sample (min. 400 words) *</Label>
                    <span className="text-sm text-muted-foreground">
                      {stylometricsText.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <Textarea
                    id="stylometrics-text"
                    placeholder="Paste text here for stylometric analysis..."
                    value={stylometricsText}
                    onChange={(e) => setStylometricsText(e.target.value)}
                    className="min-h-[200px] font-serif"
                    data-testid="textarea-stylometrics"
                  />
                </div>
                
                {stylometricsReport && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Analysis Results</Label>
                      <div className="flex gap-2">
                        {username && stylometricsData && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSaveStylometricProfile}
                            className="gap-1"
                            data-testid="button-save-profile"
                          >
                            <Save className="w-4 h-4" />
                            Save to Database
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(stylometricsReport);
                            toast({ description: "Report copied to clipboard" });
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[300px] border rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-violet-50">
                      <pre className="font-sans text-sm whitespace-pre-wrap">{stylometricsReport}</pre>
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="compare" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800">Text A</h4>
                    <div className="space-y-2">
                      <Label>Author Name *</Label>
                      <Input
                        placeholder="Author A"
                        value={stylometricsAuthorName}
                        onChange={(e) => setStylometricsAuthorName(e.target.value)}
                        data-testid="input-author-a"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Text *</Label>
                        <span className="text-xs text-muted-foreground">
                          {stylometricsText.split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <Textarea
                        placeholder="Paste Text A..."
                        value={stylometricsText}
                        onChange={(e) => setStylometricsText(e.target.value)}
                        className="min-h-[150px] font-serif text-sm"
                        data-testid="textarea-text-a"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-800">Text B</h4>
                    <div className="space-y-2">
                      <Label>Author Name *</Label>
                      <Input
                        placeholder="Author B"
                        value={stylometricsAuthorNameB}
                        onChange={(e) => setStylometricsAuthorNameB(e.target.value)}
                        data-testid="input-author-b"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Text *</Label>
                        <span className="text-xs text-muted-foreground">
                          {stylometricsTextB.split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <Textarea
                        placeholder="Paste Text B..."
                        value={stylometricsTextB}
                        onChange={(e) => setStylometricsTextB(e.target.value)}
                        className="min-h-[150px] font-serif text-sm"
                        data-testid="textarea-text-b"
                      />
                    </div>
                  </div>
                </div>
                
                {stylometricsReport && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Comparison Results</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(stylometricsReport);
                          toast({ description: "Report copied to clipboard" });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <ScrollArea className="h-[250px] border rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-violet-50">
                      <pre className="font-sans text-sm whitespace-pre-wrap">{stylometricsReport}</pre>
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
          
          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <div className="text-sm text-muted-foreground">
              Using: <span className="font-semibold uppercase">{selectedLLM}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStylometricsReport("");
                  setStylometricsData(null);
                  setStylometricsText("");
                  setStylometricsTextB("");
                  setStylometricsAuthorName("");
                  setStylometricsAuthorNameB("");
                  setStylometricsSourceTitle("");
                }}
              >
                Clear
              </Button>
              <Button
                onClick={handleStylometricsAnalyze}
                disabled={isAnalyzingStylometrics}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                data-testid="button-analyze-stylometrics"
              >
                {isAnalyzingStylometrics ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {stylometricsTab === "single" ? "Analyze" : "Compare"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
