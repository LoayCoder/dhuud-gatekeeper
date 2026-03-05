import React from 'react';
import type { MyActionsViewProps } from './types';

export function MyActionsLayout({ viewProps }: { viewProps: MyActionsViewProps }) {
  // Placeholder layout - renders basic structure
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">{viewProps.t?.('myActions.title', 'My Actions') ?? 'My Actions'}</h1>
      {viewProps.isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <p className="text-muted-foreground">
          {viewProps.allActions?.length || 0} actions
        </p>
      )}
    </div>
  );
}
