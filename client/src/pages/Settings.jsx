/**
 * Settings Page — Redesigned with shadcn/ui & Tailwind CSS
 * Application parameters, branding preferences, and default stock thresholds.
 */
import { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utils';
import {
  Settings as SettingsIcon,
  Building2,
  Image,
  SunMoon,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save
} from 'lucide-react';

const Settings = () => {
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [themeMode, setThemeMode] = useState('light');
  const [defaultMinStock, setDefaultMinStock] = useState(20);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await settingsAPI.get();
        if (data.settings) {
          setCompanyName(data.settings.company_name || '');
          setLogoUrl(data.settings.logo_url || '');
          setThemeMode(data.settings.theme || 'light');
          setDefaultMinStock(data.settings.default_minimum_stock || 20);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load application settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await settingsAPI.update({
        company_name: companyName,
        logo_url: logoUrl,
        theme: themeMode,
        default_minimum_stock: defaultMinStock
      });
      setSuccess('Settings updated successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="pb-2 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-burgundy-900/10 text-burgundy-900 dark:text-burgundy-300">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            System Preferences
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Configure shop branding, portal defaults, and warehouse safety threshold buffers.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <Card className="border border-border shadow-luxury">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-lg font-serif">Enterprise Profile</CardTitle>
          <CardDescription className="text-xs">
            Global configuration applied to invoices, WhatsApp dispatches, and reports.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-xs font-semibold">
                Shop / Firm Trading Name *
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="logoUrl" className="text-xs font-semibold">
                Brand Logo Asset URL
              </Label>
              <div className="relative">
                <Image className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="logoUrl"
                  placeholder="https://your-domain.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="themeMode" className="text-xs font-semibold">
                  Default Color Theme
                </Label>
                <div className="relative">
                  <SunMoon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select
                    id="themeMode"
                    value={themeMode}
                    onChange={(e) => setThemeMode(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-ring"
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="minStock" className="text-xs font-semibold">
                  Default Minimum Buffer (Pieces) *
                </Label>
                <div className="relative">
                  <Boxes className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="minStock"
                    type="number"
                    value={defaultMinStock}
                    onChange={(e) => setDefaultMinStock(parseInt(e.target.value, 10) || 0)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/80 flex justify-end">
              <Button
                type="submit"
                variant="luxury"
                disabled={saving}
                className="h-10 px-6 text-xs font-bold shadow-luxury"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1.5" />
                    Save Preferences
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
