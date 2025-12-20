import { cn } from "@/lib/utils";

interface LegalSectionProps {
  id: string;
  number: string;
  title: string;
  titleAr?: string;
  children: React.ReactNode;
  className?: string;
}

export function LegalSection({
  id,
  number,
  title,
  titleAr,
  children,
  className,
}: LegalSectionProps) {
  return (
    <section id={id} className={cn("mb-8 scroll-mt-20", className)}>
      <h2 className="text-xl font-bold mb-4 flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
          {number}
        </span>
        <span>
          {title}
          {titleAr && (
            <span className="block text-base font-normal text-muted-foreground mt-1" dir="rtl">
              {titleAr}
            </span>
          )}
        </span>
      </h2>
      <div className="ps-11 space-y-4 text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  );
}

interface LegalSubSectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
}

export function LegalSubSection({ number, title, children }: LegalSubSectionProps) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold mb-2 text-foreground">
        <span className="text-primary me-2">{number}</span>
        {title}
      </h3>
      <div className="ps-6 space-y-2">
        {children}
      </div>
    </div>
  );
}

interface LegalListProps {
  items: string[];
  ordered?: boolean;
}

export function LegalList({ items, ordered = false }: LegalListProps) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <ListTag className={cn(
      "space-y-1",
      ordered ? "list-decimal ps-6" : "list-disc ps-6"
    )}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ListTag>
  );
}

interface DefinitionListProps {
  definitions: { term: string; definition: string }[];
}

export function DefinitionList({ definitions }: DefinitionListProps) {
  return (
    <dl className="space-y-3">
      {definitions.map((item, index) => (
        <div key={index}>
          <dt className="font-semibold text-foreground">"{item.term}"</dt>
          <dd className="ps-4">{item.definition}</dd>
        </div>
      ))}
    </dl>
  );
}
