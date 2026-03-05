const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;

            // Simple replace of typical 'any' types that aren't Supabase tables
            // First: fn: any cases
            content = content.replace(/fn:\s*any/g, 'fn: (...args: unknown[]) => unknown');
            content = content.replace(/callback:\s*any/g, 'callback: (...args: unknown[]) => unknown');
            content = content.replace(/onChange:\s*any/g, 'onChange: (...args: unknown[]) => unknown');

            // Then cases that typically use unknown
            content = content.replace(/value:\s*any/g, 'value: unknown');
            content = content.replace(/err:\s*any/g, 'err: unknown');
            content = content.replace(/error:\s*any/g, 'error: unknown');
            content = content.replace(/event:\s*any/g, 'event: unknown');
            content = content.replace(/e:\s*any/g, 'e: unknown');
            content = content.replace(/data:\s*any/g, 'data: unknown');
            content = content.replace(/item:\s*any/g, 'item: unknown'); // General item: any -> item: unknown
            content = content.replace(/payload:\s*any/g, 'payload: unknown'); // General payload default
            content = content.replace(/(\w+):\s*any/g, (match, p1) => {
                if (['fn', 'callback', 'onChange'].includes(p1)) return match;
                return p1 + ': unknown'; // fallback replace all remaining : any variables 
            });

            // Cast stuff: as any -> as unknown
            content = content.replace(/as\s*any/g, 'as unknown');

            // Find typical unescaped quote issues in JSX:
            // This is trickier with regex, but we only have errors in features.
            // A common fix is to run eslint --fix again after we try, but eslint --fix doesn't always fix no-unescaped-entities.
            // Let's replace typical text quotes only in specific tags
            // E.g. >don't< or >it's<
            content = content.replace(/>([^<]*?)\bdon't\b([^<]*?)</gi, ">&apos;t<");
            content = content.replace(/>([^<]*?)\bit's\b([^<]*?)</gi, ">&apos;s<");
            content = content.replace(/>([^<]*?)\B'\b([^<]*?)</gi, ">&apos;<"); // random apostrophes inside text bounds
            content = content.replace(/>([^<]*?)&([^<]*?)</g, (match, prefix, suffix) => {
               // Don't replace if already an entity
               if (suffix.startsWith('apos;') || suffix.startsWith('quot;') || suffix.startsWith('amp;') || suffix.startsWith('lt;') || suffix.startsWith('gt;')) {
                   return match;
               }
               return '>' + prefix + '&amp;' + suffix + '<';
            });
            content = content.replace(/>([^<]*?)\"([^<]*?)</g, (match, p1, p2) => {
               return '>' + p1 + '&quot;' + p2 + '<';
            });

            if (content !== original) {
                fs.writeFileSync(fullPath, content);
            }
        }
    });
}

processDir('src/features');
