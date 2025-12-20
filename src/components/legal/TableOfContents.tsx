import { cn } from "@/lib/utils";

interface TOCItem {
  id: string;
  number: string;
  title: string;
}

interface TableOfContentsProps {
  items: TOCItem[];
  className?: string;
}

export function TableOfContents({ items, className }: TableOfContentsProps) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className={cn("mb-8 p-6 rounded-lg bg-muted/50 border border-border", className)}>
      <h2 className="text-lg font-semibold mb-4">Table of Contents</h2>
      <ol className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => scrollToSection(item.id)}
              className="text-start w-full hover:text-primary transition-colors flex items-center gap-2 py-1"
            >
              <span className="font-medium text-primary">{item.number}.</span>
              <span>{item.title}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
