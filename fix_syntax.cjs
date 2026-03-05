const fs = require('fs');

const invPath = 'src/features/investigation/components/InvestigationListView.tsx';
let invContent = fs.readFileSync(invPath, 'utf8');
invContent = invContent.replace(/days âš ï¸ /g, "days ⚠️");
fs.writeFileSync(invPath, invContent);
console.log('Fixed InvestigationListView.tsx');

const sections = ['A', 'B', 'C', 'D', 'E', 'F'];
sections.forEach(s => {
    const secPath = `src/features/investigation/components/environmental-impact/EnvironmentalContaminationForm/components/Section${s}.tsx`;
    if (fs.existsSync(secPath)) {
        let content = fs.readFileSync(secPath, 'utf8');
        
        const searchRegex = new RegExp(`<AccordionItem value="section-${s.toLowerCase()}" className="border rounded-lg">\\s*<AccordionTrigger className="px-4 hover:no-underline">\\s*<span className="font-medium">\\s*{Section ${s}:[^}]+}\\s*</span>\\s*</AccordionTrigger>\\s*<AccordionItem value="section-${s.toLowerCase()}" className="border rounded-lg">`);
        
        if (content.match(searchRegex)) {
            content = content.replace(searchRegex, `<AccordionItem value="section-${s.toLowerCase()}" className="border rounded-lg">`);
            fs.writeFileSync(secPath, content);
            console.log(`Fixed Section${s}.tsx duplicate Accordion block using {Section X: ...}`);
        } else {
            // Check for the other format which was just duplicate verbatim
            const altSearchRegex = new RegExp(`<AccordionItem value="section-${s.toLowerCase()}" className="border rounded-lg">\\s*<AccordionTrigger className="px-4 hover:no-underline">\\s*<span className="font-medium">\\s*{t\\([^\\)]+\\)}\\s*</span>\\s*</AccordionTrigger>\\s*<AccordionItem value="section-${s.toLowerCase()}" className="border rounded-lg">`);
            if (content.match(altSearchRegex)) {
                content = content.replace(altSearchRegex, `<AccordionItem value="section-${s.toLowerCase()}" className="border rounded-lg">`);
                fs.writeFileSync(secPath, content);
                console.log(`Fixed Section${s}.tsx duplicate Accordion block using {t(...)}`);
            }
        }
    }
});
