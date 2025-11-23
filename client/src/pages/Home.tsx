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
  Copy
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

// Mock Data for Simulation
const MOCK_QUOTES_SIMPLE = [
  "The essence of knowledge lies not in its accumulation, but in its application to the novel structures of reality.",
  "Logic, when divorced from the chaotic nature of human experience, becomes a sterile tool of abstraction.",
  "Language frames our world, yet it is the silence between words where meaning truly resides."
];

const MOCK_QUOTES_CONTEXT = [
  {
    quote: "The essence of knowledge lies not in its accumulation, but in its application to the novel structures of reality.",
    context: "Kuczynski's reflection on the limitations of traditional epistemology in the face of modern complexity."
  },
  {
    quote: "Logic, when divorced from the chaotic nature of human experience, becomes a sterile tool of abstraction.",
    context: "A critique of pure rationalism that fails to account for the phenomenological aspects of existence."
  },
  {
    quote: "Language frames our world, yet it is the silence between words where meaning truly resides.",
    context: "An exploration of the Wittgensteinian boundaries of expression and the ineffable."
  }
];

const MOCK_SUMMARY = `The provided text delves into the philosophical intersection of logic and experience. It argues that while formal systems offer precision, they often miss the nuanced, chaotic texture of lived reality. 

The author suggests that a more robust framework must integrate the rigor of extensional logic with the fluidity of phenomenological insight. This synthesis is presented not as a rejection of structure, but as an evolution of it, necessary for comprehending the complexities of the modern human condition.`;

const MOCK_DATABASE = `ID: DOC-2024-001
TIMESTAMP: 2024-11-23T10:45:00Z
TYPE: Philosophical Essay
LENGTH: 854 words
ENTITIES:
- Kuczynski (Author)
- Extensional Logic (Concept)
- Phenomenology (Concept)
- Epistemology (Field)
KEYWORDS: logic, structure, chaos, meaning, silence, application
SENTENCE_MAP:
[001] "The essence of knowledge..." (p.1, l.1)
[002] "Logic, when divorced..." (p.1, l.4)
[003] "Language frames..." (p.2, l.2)
METADATA_HASH: 7a9s8d7f9a8s7d9f8a7s`;

type LLM = "grok" | "openai" | "anthropic" | "perplexity" | "deepseek";

export default function Home() {
  const [text, setText] = useState("");
  const [selectedLLM, setSelectedLLM] = useState<LLM>("grok");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleProcess = () => {
    if (!text.trim()) {
      toast({
        title: "Input required",
        description: "Please enter some text or upload a file to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate API delay
    setTimeout(() => {
      setIsProcessing(false);
      setHasResult(true);
      toast({
        title: "Analysis Complete",
        description: `Processed using ${selectedLLM.charAt(0).toUpperCase() + selectedLLM.slice(1)}`,
      });
    }, 2500);
  };

  const handleFileUpload = (file: File) => {
    if (file) {
      // Simulate reading file
      setText(`[Loaded content from ${file.name}]\n\n` + 
        "This is a simulated content extraction from the uploaded file. In a real production environment, this would contain the full parsed text of the document you uploaded.\n\n" + 
        "For now, you can edit this text or add more content to test the analysis features.");
      toast({
        title: "File Uploaded",
        description: `${file.name} has been loaded successfully.`,
      });
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
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-md flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Text Intelligence Studio</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Powered by</span>
              <Select value={selectedLLM} onValueChange={(v) => setSelectedLLM(v as LLM)}>
                <SelectTrigger className="h-7 w-[130px] border-none bg-transparent focus:ring-0 p-0 text-foreground font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grok">Grok</SelectItem>
                  <SelectItem value="openai">OpenAI o1</SelectItem>
                  <SelectItem value="anthropic">Claude 3.5</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-8rem)]">
          
          {/* Input Section */}
          <section className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-medium text-foreground">Source Document</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs gap-2"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload File
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
              className={`flex-1 p-4 flex flex-col gap-4 border-muted shadow-sm relative group overflow-hidden transition-all duration-200 ${isDragging ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <Textarea 
                placeholder="Enter text, paste content, or upload a document to begin analysis..." 
                className="flex-1 resize-none border-none focus-visible:ring-0 p-4 text-lg leading-relaxed font-serif bg-transparent"
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

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-xs text-muted-foreground font-mono">
                  {text.split(/\s+/).filter(Boolean).length} words
                </span>
                <Button 
                  onClick={handleProcess} 
                  disabled={isProcessing || !text}
                  className="min-w-[140px]"
                  data-testid="button-process"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span> Processing...
                    </>
                  ) : (
                    <>
                      Analyze Text <ChevronRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </section>

          {/* Output Section */}
          <section className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-medium text-foreground">Analysis Results</h2>
              {hasResult && (
                <div className="flex gap-2">
                   <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy All">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Download Report">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
                {!hasResult ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/10 p-8 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Bot className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Ready to Analyze</h3>
                    <p className="max-w-xs text-sm">
                      Select your preferred LLM and submit text to generate quotes, summaries, and data structures.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full"
                  >
                    <Card className="h-full border-muted shadow-sm overflow-hidden flex flex-col">
                      <Tabs defaultValue="quotes-list" className="w-full h-full flex flex-col">
                        <div className="border-b px-4 bg-muted/30">
                          <TabsList className="h-12 bg-transparent p-0 gap-6">
                            <TabTrigger value="quotes-list" icon={<Quote className="w-4 h-4" />} label="Quotes" />
                            <TabTrigger value="quotes-context" icon={<AlignLeft className="w-4 h-4" />} label="Context" />
                            <TabTrigger value="summary" icon={<FileText className="w-4 h-4" />} label="Summary" />
                            <TabTrigger value="database" icon={<Database className="w-4 h-4" />} label="Database" />
                          </TabsList>
                        </div>

                        <div className="flex-1 bg-card">
                          <ScrollArea className="h-full">
                            <div className="p-6">
                              <TabsContent value="quotes-list" className="mt-0 space-y-6 outline-none">
                                <Header 
                                  title="Key Quotations" 
                                  subtitle="Direct citations extracted from the source text."
                                />
                                <ul className="space-y-4">
                                  {MOCK_QUOTES_SIMPLE.map((quote, i) => (
                                    <li key={i} className="flex gap-4 group">
                                      <span className="flex-none w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-mono mt-1">
                                        {i + 1}
                                      </span>
                                      <p className="font-serif text-lg leading-relaxed text-foreground/90 border-l-2 border-transparent group-hover:border-accent pl-0 group-hover:pl-4 transition-all duration-200">
                                        "{quote}"
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              </TabsContent>

                              <TabsContent value="quotes-context" className="mt-0 space-y-6 outline-none">
                                <Header 
                                  title="Annotated Citations" 
                                  subtitle="Quotations with contextual analysis and commentary."
                                />
                                <div className="space-y-8">
                                  {MOCK_QUOTES_CONTEXT.map((item, i) => (
                                    <div key={i} className="group">
                                      <blockquote className="font-serif text-xl text-foreground border-l-4 border-primary/20 pl-6 py-2 mb-3">
                                        "{item.quote}"
                                      </blockquote>
                                      <div className="flex items-start gap-2 pl-7 text-sm text-muted-foreground">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                                        <p>{item.context}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>

                              <TabsContent value="summary" className="mt-0 space-y-6 outline-none">
                                <Header 
                                  title="Compressed Rewrite" 
                                  subtitle="Paragraph-by-paragraph density compression."
                                />
                                <div className="prose prose-stone max-w-none">
                                  <p className="text-lg leading-loose font-serif">
                                    {MOCK_SUMMARY}
                                  </p>
                                </div>
                              </TabsContent>

                              <TabsContent value="database" className="mt-0 outline-none h-full">
                                <Header 
                                  title="Data Structure" 
                                  subtitle="Fine-grained parsed database format."
                                />
                                <div className="bg-muted/50 rounded-lg p-4 border overflow-x-auto">
                                  <pre className="font-mono text-sm text-muted-foreground">
                                    {MOCK_DATABASE}
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