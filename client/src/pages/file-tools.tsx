import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { 
  FileText, Image, FileSpreadsheet, Presentation, 
  ArrowRight, Download, Loader2, Upload, Merge, 
  Scissors, Minimize2, Crown, Sparkles, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

const conversionOptions = [
  { from: "jpg", to: "pdf", label: "JPG to PDF", fromIcon: Image, toIcon: FileText },
  { from: "png", to: "pdf", label: "PNG to PDF", fromIcon: Image, toIcon: FileText },
  { from: "jpg", to: "png", label: "JPG to PNG", fromIcon: Image, toIcon: Image },
  { from: "png", to: "jpg", label: "PNG to JPG", fromIcon: Image, toIcon: Image },
];

export default function FileToolsPage() {
  const [activeTab, setActiveTab] = useState("convert");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [conversionType, setConversionType] = useState("jpg-to-pdf");
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState("medium");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isPremium } = useSubscription();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 20MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 10) {
      toast({ title: "Too many files", description: "Maximum 10 files at once", variant: "destructive" });
      return;
    }
    setSelectedFiles(files);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      toast({ title: "No file selected", description: "Please select a file to convert", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const base64 = await readFileAsDataURL(selectedFile);
      const [from, , to] = conversionType.split("-");
      
      const response = await fetch("/api/file-tools/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          file: base64,
          fileName: selectedFile.name,
          fromFormat: from,
          toFormat: to
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Conversion failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `converted-${selectedFile.name.split('.')[0]}.${to}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Success!", description: "File converted and downloaded" });
      setSelectedFile(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) {
      toast({ title: "Need more files", description: "Select at least 2 files to merge", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const filePromises = selectedFiles.map(async (file) => {
        const data = await readFileAsDataURL(file);
        return { name: file.name, data };
      });

      const files = await Promise.all(filePromises);
      
      const response = await fetch("/api/file-tools/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ files }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Merge failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged-document.pdf";
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Success!", description: "Files merged and downloaded" });
      setSelectedFiles([]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompress = async () => {
    if (!selectedFile) {
      toast({ title: "No file selected", description: "Please select a file to compress", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const base64 = await readFileAsDataURL(selectedFile);
      
      const response = await fetch("/api/file-tools/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          file: base64,
          fileName: selectedFile.name,
          level: compressionLevel
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Compression failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compressed-${selectedFile.name}`;
      a.click();
      URL.revokeObjectURL(url);

      const originalSize = selectedFile.size;
      const newSize = blob.size;
      const reduction = Math.round((1 - newSize / originalSize) * 100);
      
      toast({ title: "Success!", description: `File compressed by ${reduction}%` });
      setSelectedFile(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">BrightBoard</span>
              <Badge variant="secondary">File Tools</Badge>
            </div>
          </div>
          {!isPremium && (
            <Link href="/pricing">
              <Button size="sm" className="gap-2" data-testid="button-upgrade">
                <Crown className="h-4 w-4" />
                Remove Watermark
              </Button>
            </Link>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">File Tools for Teachers</h1>
          <p className="text-muted-foreground">Convert, merge, and compress your documents - all in one place</p>
          {!isPremium && (
            <Badge variant="outline" className="mt-2">
              Free users: Files include BrightBoard watermark
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="convert" className="gap-2" data-testid="tab-convert">
              <ArrowRight className="h-4 w-4" />
              Convert
            </TabsTrigger>
            <TabsTrigger value="merge" className="gap-2" data-testid="tab-merge">
              <Merge className="h-4 w-4" />
              Merge
            </TabsTrigger>
            <TabsTrigger value="compress" className="gap-2" data-testid="tab-compress">
              <Minimize2 className="h-4 w-4" />
              Compress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="convert">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-primary" />
                  Convert Files
                </CardTitle>
                <CardDescription>Transform your files between different formats</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {conversionOptions.map((opt) => (
                    <button
                      key={`${opt.from}-to-${opt.to}`}
                      onClick={() => setConversionType(`${opt.from}-to-${opt.to}`)}
                      className={`p-4 rounded-lg border-2 transition-all hover-elevate ${
                        conversionType === `${opt.from}-to-${opt.to}`
                          ? "border-primary bg-primary/5"
                          : "border-muted"
                      }`}
                      data-testid={`conversion-${opt.from}-to-${opt.to}`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <opt.fromIcon className="h-5 w-5 text-muted-foreground" />
                        <ArrowRight className="h-4 w-4" />
                        <opt.toIcon className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm font-medium">{opt.label}</p>
                    </button>
                  ))}
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    data-testid="input-file-convert"
                  />
                  {selectedFile ? (
                    <div className="space-y-4">
                      <FileText className="h-12 w-12 mx-auto text-primary" />
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button variant="outline" onClick={() => setSelectedFile(null)}>
                        Choose Different File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Drag & drop or click to upload</p>
                      <Button onClick={() => fileInputRef.current?.click()} data-testid="button-upload-convert">
                        Select File
                      </Button>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleConvert} 
                  disabled={!selectedFile || isProcessing}
                  className="w-full"
                  size="lg"
                  data-testid="button-convert"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Convert & Download
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="merge">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Merge className="h-5 w-5 text-primary" />
                  Merge PDFs
                </CardTitle>
                <CardDescription>Combine multiple PDF files into one document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    ref={multiFileInputRef}
                    onChange={handleMultiFileSelect}
                    className="hidden"
                    accept=".pdf"
                    multiple
                    data-testid="input-files-merge"
                  />
                  {selectedFiles.length > 0 ? (
                    <div className="space-y-4">
                      <Merge className="h-12 w-12 mx-auto text-primary" />
                      <p className="font-medium">{selectedFiles.length} files selected</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {selectedFiles.map((file, i) => (
                          <Badge key={i} variant="secondary">{file.name}</Badge>
                        ))}
                      </div>
                      <Button variant="outline" onClick={() => setSelectedFiles([])}>
                        Clear Selection
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Select multiple PDF files to merge</p>
                      <Button onClick={() => multiFileInputRef.current?.click()} data-testid="button-upload-merge">
                        Select PDFs
                      </Button>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleMerge} 
                  disabled={selectedFiles.length < 2 || isProcessing}
                  className="w-full"
                  size="lg"
                  data-testid="button-merge"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Merge & Download
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compress">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Minimize2 className="h-5 w-5 text-primary" />
                  Compress Files
                </CardTitle>
                <CardDescription>Reduce file size while maintaining quality</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Compression Level</Label>
                  <Select value={compressionLevel} onValueChange={setCompressionLevel}>
                    <SelectTrigger data-testid="select-compression">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Best Quality)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="high">High (Smallest Size)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    data-testid="input-file-compress"
                  />
                  {selectedFile ? (
                    <div className="space-y-4">
                      <FileText className="h-12 w-12 mx-auto text-primary" />
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button variant="outline" onClick={() => setSelectedFile(null)}>
                        Choose Different File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Select a file to compress</p>
                      <Button onClick={() => fileInputRef.current?.click()} data-testid="button-upload-compress">
                        Select File
                      </Button>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleCompress} 
                  disabled={!selectedFile || isProcessing}
                  className="w-full"
                  size="lg"
                  data-testid="button-compress"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Compressing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Compress & Download
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
