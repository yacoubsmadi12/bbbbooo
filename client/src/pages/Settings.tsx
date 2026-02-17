import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how the application looks on your screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark themes.
                  </p>
                </div>
                <Switch 
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  data-testid="switch-dark-mode"
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <Label>Theme Preference</Label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-all ${
                      theme === "light" ? "border-primary bg-primary/5" : "border-muted"
                    }`}
                    data-testid="button-theme-light"
                  >
                    <div className="w-full h-12 bg-white rounded border" />
                    <span className="text-xs font-medium">Light</span>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-all ${
                      theme === "dark" ? "border-primary bg-primary/5" : "border-muted"
                    }`}
                    data-testid="button-theme-dark"
                  >
                    <div className="w-full h-12 bg-slate-950 rounded border" />
                    <span className="text-xs font-medium">Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={`flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-all ${
                      theme === "system" ? "border-primary bg-primary/5" : "border-muted"
                    }`}
                    data-testid="button-theme-system"
                  >
                    <div className="w-full h-12 bg-gradient-to-r from-white to-slate-950 rounded border" />
                    <span className="text-xs font-medium">System</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Manage AI model settings for book generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use Anthropic (Claude)</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable Claude 3.5 Sonnet for text generation.
                  </p>
                </div>
                <Switch 
                  checked={localStorage.getItem("ai_model") === "anthropic"}
                  onCheckedChange={(checked) => {
                    localStorage.setItem("ai_model", checked ? "anthropic" : "openai");
                    window.location.reload();
                  }}
                  data-testid="switch-ai-model"
                />
              </div>
              <div className="p-4 bg-muted rounded-md border border-dashed text-center text-sm text-muted-foreground">
                AI settings are currently managed via Replit Integrations.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
