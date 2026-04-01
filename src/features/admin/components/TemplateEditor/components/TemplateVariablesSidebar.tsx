import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GripVertical, ListFilter, X, Plus, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SYSTEM_VARIABLES } from '../constants';

export function TemplateVariablesSidebar({ state }: { state: any }) {
  const { t } = useTranslation();
  const {
    showAllVariables, setShowAllVariables, formData, filteredVariables,
    handleDragStart, handleVariableClick, removeVariable,
    newVariable, setNewVariable, addVariable
  } = state;

  return (
    <>
      <div className="grid grid-cols-[220px_1fr] gap-4">
        {/* Variables Sidebar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              {t('templates.variables')}
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllVariables(!showAllVariables)}
              className="h-6 px-2 text-xs"
            >
              <ListFilter className="h-3 w-3 me-1" />
              {showAllVariables ? t('templates.filter') : t('templates.all')}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mb-1">
            {showAllVariables 
              ? t('templates.allVariablesCount', { count: SYSTEM_VARIABLES.length })
              : t('templates.filteredVariablesCount', { count: filteredVariables.length, category: formData.category })}
          </div>
          <ScrollArea className="h-[200px] border rounded-md p-2">
            <div className="flex flex-col gap-1.5">
              {filteredVariables.map((variable: any) => (
                <button
                  key={variable.key}
                  type="button"
                  draggable
                  onDragStart={(e) => handleDragStart(e, variable.key)}
                  onClick={() => handleVariableClick(variable.key)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md border bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-start"
                  title={`${variable.label} - ${variable.example}`}
                >
                  <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="font-mono text-primary truncate">
                    {variable.key}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
          <p className="text-xs text-muted-foreground">
            {t('templates.clickOrDragToInsert')}
          </p>
        </div>
        
        {/* Editor goes here, handled in main component for ref */}
      </div>

      {/* Active Variables */}
      <div className="space-y-2 mt-4">
        <Label>{t('templates.activeVariableMappings')}</Label>
        
        {/* Event type warning for HSSE categories */}
        {(formData.category === 'incidents' || formData.category === 'observations') && 
         !formData.variable_keys.includes('event_type') && (
          <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <strong>{t('templates.recommended')}</strong> {t('templates.recommendedEventType')}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.variable_keys.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              {t('templates.noVariablesAdded')}
            </span>
          ) : (
            formData.variable_keys.map((key: string, index: number) => (
              <Badge key={key} variant="secondary" className="gap-1 font-mono">
                {`{{${index + 1}}}}`} = {key}
                {key === 'event_type' && (formData.category === 'incidents' || formData.category === 'observations') && (
                  <span className="text-green-600 dark:text-green-400 ms-1" title="Required for HSSE events">✓</span>
                )}
                <button
                  type="button"
                  onClick={() => removeVariable(key)}
                  className="ms-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={newVariable}
            onChange={(e) => setNewVariable(e.target.value.replace(/\s+/g, '_'))}
            placeholder={t('templates.customVariablePlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addVariable();
              }
            }}
            className="font-mono"
          />
          <Button type="button" variant="outline" onClick={addVariable}>
            <Plus className="h-4 w-4 me-1" />
            {t('templates.addCustom')}
          </Button>
        </div>
      </div>
    </>
  );
}
