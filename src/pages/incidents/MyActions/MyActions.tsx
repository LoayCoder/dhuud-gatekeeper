import React from 'react';
import { useMyActions } from './hooks/useMyActions';
import { MyActionsLayout } from './MyActionsLayout';

export default function MyActions() {
  const viewProps = useMyActions();
  return <MyActionsLayout viewProps={viewProps} />;
}
