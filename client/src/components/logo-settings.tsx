import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Upload, Wand2, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { OrganizationSettings } from "@shared/schema";

export function LogoSettings() {
  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [logoStyle, setLogoStyle] = useState("modern, professional");
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<OrganizationSettings>({
    queryKey: ["/api/settings"],
  });

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
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewLogo(data.logo);
      toast({
        title: "Logo generated",
        description: "Review your new logo and save it if you like it.",
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
            <div className="space-y-2">
              <Label htmlFor="org-name">School/Organization Name</Label>
              <Input
                id="org-name"
                placeholder="Enter your school or organization name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
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
                data-testid="input-logo-style"
              />
            </div>

            <Button
              onClick={handleGenerateLogo}
              disabled={generateLogoMutation.isPending || !orgName.trim()}
              className="w-full"
              data-testid="button-generate-logo"
            >
              {generateLogoMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Logo
                </>
              )}
            </Button>

            {previewLogo && (
              <div className="space-y-2">
                <Label>Generated Logo</Label>
                <div className="flex items-center gap-4">
                  <img
                    src={previewLogo}
                    alt="Generated logo"
                    className="h-24 w-24 object-contain rounded border bg-white"
                    data-testid="img-generated-logo"
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleSaveLogo}
                      disabled={updateSettingsMutation.isPending}
                      data-testid="button-save-generated-logo"
                    >
                      {updateSettingsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Save Logo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGenerateLogo}
                      disabled={generateLogoMutation.isPending}
                      data-testid="button-regenerate-logo"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
