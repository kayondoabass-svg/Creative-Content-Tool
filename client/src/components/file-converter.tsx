import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileType, Upload, Download, Loader2, ArrowRight, File, Image, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const formatOptions = [
  { value: "pdf", label: "PDF" },
  { value: "jpeg", label: "JPEG Image" },
  { value: "png", label: "PNG Image" },
];

export function FileConverter() {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ data: string; name: string; type: string } | null>(null);
  const [targetFormat, setTargetFormat] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const convertMutation = useMutation({
    mutationFn: async (data: { file: string; fileName: string; fromFormat: string; toFormat: string }) => {
      const res = await apiRequest("POST", "/api/convert", data);
      return res.json();
    },
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = data.file;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Conversion complete",
        description: `Your file has been converted and downloaded as ${data.fileName}`,
      });
      
      setSelectedFile(null);
      setTargetFormat("");
    },
    onError: (error: Error) => {
      toast({
        title: "Conversion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file under 20MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        data: reader.result as string,
        name: file.name,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleConvert = () => {
    if (!selectedFile || !targetFormat) return;
    
    const fromFormat = selectedFile.name.split(".").pop() || "unknown";
    
    convertMutation.mutate({
      file: selectedFile.data,
      fileName: selectedFile.name,
      fromFormat,
      toFormat: targetFormat,
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-6 w-6 text-muted-foreground" />;
    if (type.includes("pdf")) return <FileText className="h-6 w-6 text-muted-foreground" />;
    return <File className="h-6 w-6 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-file-converter">
          <FileType className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>File Converter</DialogTitle>
          <DialogDescription>
            Convert your files between different formats like PDF, JPEG, and PNG.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select File</Label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.pdf,.txt"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="input-convert-file"
            />
            
            {selectedFile ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                {getFileIcon(selectedFile.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" data-testid="text-selected-file">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedFile.type}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setTargetFormat("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  data-testid="button-clear-file"
                >
                  Change
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 flex flex-col gap-2"
                data-testid="button-select-file"
              >
                <Upload className="h-6 w-6" />
                <span>Click to select a file</span>
                <span className="text-xs text-muted-foreground">
                  Supports images, PDF, and text files (max 20MB)
                </span>
              </Button>
            )}
          </div>

          {selectedFile && (
            <>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <span className="text-sm">Convert to</span>
                <ArrowRight className="h-4 w-4" />
              </div>

              <div className="space-y-2">
                <Label>Target Format</Label>
                <Select value={targetFormat} onValueChange={setTargetFormat}>
                  <SelectTrigger data-testid="select-target-format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {formatOptions.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleConvert}
                disabled={!targetFormat || convertMutation.isPending}
                className="w-full"
                data-testid="button-convert"
              >
                {convertMutation.isPending ? (
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
