import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface LegalPageLayoutProps {
  title: string;
  titleAr?: string;
  lastUpdated: string;
  effectiveDate: string;
  version?: string;
  children: React.ReactNode;
}

export function LegalPageLayout({
  title,
  titleAr,
  lastUpdated,
  effectiveDate,
  version = "1.0",
  children,
}: LegalPageLayoutProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  return (
    <div className="min-h-screen bg-background" dir={i18n.dir()}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
              <ArrowRight className={cn("h-5 w-5", isRTL && "rotate-180")} />
              <span className="font-medium">Dhuuus</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link to="/cookies" className="hover:text-foreground transition-colors">
                Cookies
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Title Section */}
        <div className="mb-8 border-b border-border pb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">
                {isRTL && titleAr ? titleAr : title}
              </h1>
              {titleAr && !isRTL && (
                <p className="text-lg text-muted-foreground" dir="rtl">
                  {titleAr}
                </p>
              )}
            </div>
          </div>
          
          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Last Updated: {lastUpdated}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Effective: {effectiveDate}</span>
            </div>
            <div className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
              Version {version}
            </div>
          </div>
        </div>

        {/* Document Content */}
        <article className="prose prose-slate dark:prose-invert max-w-none">
          {children}
        </article>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            <div>
              <h4 className="font-semibold mb-3">Legal Documents</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link to="/cookies" className="hover:text-foreground">Cookie Policy</Link></li>
                <li><Link to="/acceptable-use" className="hover:text-foreground">Acceptable Use Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Agreements</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/dpa" className="hover:text-foreground">Data Processing Agreement</Link></li>
                <li><Link to="/sla" className="hover:text-foreground">Service Level Agreement</Link></li>
                <li><Link to="/refund-policy" className="hover:text-foreground">Refund Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Contact</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Email: legal@dhuuus.com</li>
                <li>Support: support@dhuuus.com</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-border text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Dhuuus. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  );
}
