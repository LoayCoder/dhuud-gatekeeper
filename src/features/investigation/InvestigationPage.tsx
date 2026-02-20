
import { InvestigationProvider } from "./context/InvestigationContext";
import { InvestigationLayout } from "./components/layout/InvestigationLayout";

export default function InvestigationPage() {
    return (
        <InvestigationProvider>
            <InvestigationLayout />
        </InvestigationProvider>
    );
}
