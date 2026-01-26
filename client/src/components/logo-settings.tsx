import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Upload, Wand2, X, Loader2, Check, Crown, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { OrganizationSettings } from "@shared/schema";

export function LogoSettings() {
  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [logoStyle, setLogoStyle] = useState("modern, professional");
  const [generatedLogos, setGeneratedLogos] = useState<string[]>([]);
  const [logoVariations, setLogoVariations] = useState<string[]>([]);
  const [selectedLogoIndex, setSelectedLogoIndex] = useState<number | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<OrganizationSettings>({
    queryKey: ["/api/settings"],
  });
  
  const { data: subscriptionStatus } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/subscription/status"],
  });
  
  const isPremium = subscriptionStatus?.isPremium;

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<OrganizationSettings>) => {
      const res = await apiRequest("POST", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings saved",
        description: "Your logo has been updated.",
      });
      setPreviewLogo(null);
      setGeneratedLogos([]);
      setSelectedLogoIndex(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateLogoMutation = useMutation({
    mutationFn: async (data: { name: string; style: string }) => {
      const res = await apiRequest("POST", "/api/generate-logo", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate logos");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedLogos(data.logos || []);
      setLogoVariations(data.variations || []);
      setSelectedLogoIndex(null);
      setPreviewLogo(null);
      toast({
        title: "Logos generated",
        description: "Choose your favorite from the 5 options below.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleDownloadLogo = (logoUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = logoUrl;
    link.download = `logo-option-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = () => {
    if (previewLogo) {
      updateSettingsMutation.mutate({ logo: previewLogo, name: orgName || undefined });
    }
  };

  const handleRemoveLogo = () => {
    updateSettingsMutation.mutate({ logo: undefined });
  };

  const handleGenerateLogo = () => {
    if (!orgName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your school or organization name.",
        variant: "destructive",
      });
      return;
    }
    generateLogoMutation.mutate({ name: orgName, style: logoStyle });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Logo Settings</DialogTitle>
          <DialogDescription>
            Upload your school or organization logo, or generate one using AI.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" data-testid="tab-upload-logo">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="generate" data-testid="tab-generate-logo">
              <Wand2 className="h-4 w-4 mr-2" />
              Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label>Current Logo</Label>
              <div className="flex items-center gap-4">
                {settings?.logo ? (
                  <div className="relative">
                    <img
                      src={settings.logo}
                      alt="Current logo"
                      className="h-16 w-16 object-contain rounded border bg-white"
                      data-testid="img-current-logo"
                    />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      onClick={handleRemoveLogo}
                      data-testid="button-remove-logo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded border border-dashed flex items-center justify-center text-muted-foreground text-xs">
                    No logo
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Upload New Logo</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-logo-file"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                data-testid="button-upload-logo"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>

            {previewLogo && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center gap-4">
                  <img
                    src={previewLogo}
                    alt="Preview"
                    className="h-16 w-16 object-contain rounded border bg-white"
                    data-testid="img-logo-preview"
                  />
                  <Button
                    onClick={handleSaveLogo}
                    disabled={updateSettingsMutation.isPending}
                    data-testid="button-save-logo"
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Save Logo
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            {!isPremium && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-sm">Premium Feature</p>
                  <p className="text-xs text-muted-foreground">Upgrade to generate custom AI logos</p>
                </div>
                <Button size="sm" className="ml-auto" asChild>
                  <a href="/pricing">Upgrade</a>
                </Button>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="org-name">School/Organization Name</Label>
              <Input
                id="org-name"
                placeholder="Enter your school or organization name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!isPremium}
                data-testid="input-org-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo-style">Style</Label>
              <Input
                id="logo-style"
                placeholder="e.g., modern, playful, academic"
                value={logoStyle}
                onChange={(e) => setLogoStyle(e.target.value)}
                disabled={!isPremium}
                data-testid="input-logo-style"
              />
            </div>

            <Button
              onClick={handleGenerateLogo}
              disabled={generateLogoMutation.isPending || !orgName.trim() || !isPremium}
              className="w-full"
              data-testid="button-generate-logo"
            >
              {generateLogoMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating 5 Logos...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate 5 Logo Options
                  {!isPremium && <Crown className="h-3 w-3 ml-1 text-amber-500" />}
                </>
              )}
            </Button>

            {generatedLogos.length > 0 && (
              <div className="space-y-3">
                <Label>Choose Your Logo (Click to select)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {generatedLogos.map((logo, index) => (
                    <div
                      key={index}
                      className={`relative cursor-pointer rounded-lg border-2 p-2 transition-all hover-elevate ${
                        selectedLogoIndex === index 
                          ? "border-primary bg-primary/5" 
                          : "border-muted"
                      }`}
                      onClick={() => {
                        setSelectedLogoIndex(index);
                        setPreviewLogo(logo);
                      }}
                      data-testid={`logo-option-${index}`}
                    >
                      {selectedLogoIndex === index && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <img
                        src={logo}
                        alt={`Logo option ${index + 1}`}
                        className="w-full aspect-square object-contain rounded bg-white"
                      />
                      <div className="mt-1 flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs truncate max-w-[80%]">
                          {logoVariations[index]?.split(",")[0] || `Option ${index + 1}`}
                        </Badge>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadLogo(logo, index);
                          }}
                          className="p-1 hover:bg-muted rounded"
                          data-testid={`download-logo-${index}`}
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedLogoIndex !== null && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveLogo}
                      disabled={updateSettingsMutation.isPending}
                      className="flex-1"
                      data-testid="button-save-selected-logo"
                    >
                      {updateSettingsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save Selected Logo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGenerateLogo}
                      disabled={generateLogoMutation.isPending}
                      data-testid="button-regenerate-logos"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate New
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
