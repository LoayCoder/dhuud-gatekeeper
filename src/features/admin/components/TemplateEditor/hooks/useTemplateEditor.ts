import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTemplateTranslation } from '@/features/admin/hooks/use-template-translation';
import { NotificationTemplate, CreateTemplateInput } from '@/hooks/useNotificationTemplates';
import { SYSTEM_VARIABLES, CATEGORY_VARIABLES } from '../constants';
import { TemplateEditorProps } from '../types';

export function useTemplateEditor({ template, open, onSave }: Pick<TemplateEditorProps, 'template' | 'open' | 'onSave'>) {
  const { i18n } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const { translate, isTranslating } = useTemplateTranslation();
  const SOURCE_LANGUAGE = 'en';
  
  const [formData, setFormData] = useState<CreateTemplateInput>({
    slug: '',
    meta_template_name: '',
    content_pattern: '',
    variable_keys: [],
    default_gateway: 'wasender',
    category: 'general',
    language: 'en',
    is_active: true,
    channel_type: 'whatsapp',
    email_subject: '',
  });
  const [newVariable, setNewVariable] = useState('');
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [showAllVariables, setShowAllVariables] = useState(false);
  const [activeDropTarget, setActiveDropTarget] = useState<'content' | 'subject'>('content');

  useEffect(() => {
    if (template) {
      setFormData({
        slug: template.slug,
        meta_template_name: template.meta_template_name || '',
        content_pattern: template.content_pattern,
        variable_keys: template.variable_keys || [],
        default_gateway: template.default_gateway,
        category: template.category || 'general',
        language: template.language || 'en',
        is_active: template.is_active,
        channel_type: template.channel_type || 'whatsapp',
        email_subject: template.email_subject || '',
      });
      // Initialize preview data with examples
      const preview: Record<string, string> = {};
      (template.variable_keys || []).forEach((key) => {
        const sysVar = SYSTEM_VARIABLES.find(v => v.key === key);
        preview[key] = sysVar?.example || `[${key}]`;
      });
      setPreviewData(preview);
    } else {
      setFormData({
        slug: '',
        meta_template_name: '',
        content_pattern: '',
        variable_keys: [],
        default_gateway: 'wasender',
        category: 'general',
        language: 'en',
        is_active: true,
        channel_type: 'whatsapp',
        email_subject: '',
      });
      setPreviewData({});
    }
  }, [template, open]);

  // Insert variable at cursor position in content
  const insertVariable = (key: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData.content_pattern;
    
    let placeholderNum: number;
    const existingIndex = formData.variable_keys.indexOf(key);
    
    if (existingIndex >= 0) {
      placeholderNum = existingIndex + 1;
    } else {
      placeholderNum = formData.variable_keys.length + 1;
      const newVariables = [...formData.variable_keys, key];
      const sysVar = SYSTEM_VARIABLES.find(v => v.key === key);
      setFormData(prev => ({ ...prev, variable_keys: newVariables }));
      setPreviewData(prev => ({ ...prev, [key]: sysVar?.example || `[${key}]` }));
    }
    
    const placeholder = `{{${placeholderNum}}}`;
    const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
    
    setFormData(prev => ({ ...prev, content_pattern: newValue }));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  // Insert variable at email subject cursor position
  const insertVariableToSubject = (key: string) => {
    const input = emailSubjectRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = formData.email_subject || '';
    
    let placeholderNum: number;
    const existingIndex = formData.variable_keys.indexOf(key);
    
    if (existingIndex >= 0) {
      placeholderNum = existingIndex + 1;
    } else {
      placeholderNum = formData.variable_keys.length + 1;
      const newVariables = [...formData.variable_keys, key];
      const sysVar = SYSTEM_VARIABLES.find(v => v.key === key);
      setFormData(prev => ({ ...prev, variable_keys: newVariables }));
      setPreviewData(prev => ({ ...prev, [key]: sysVar?.example || `[${key}]` }));
    }
    
    const placeholder = `{{${placeholderNum}}}`;
    const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
    
    setFormData(prev => ({ ...prev, email_subject: newValue }));
    
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  const addVariable = () => {
    if (newVariable && !formData.variable_keys.includes(newVariable)) {
      const updated = [...formData.variable_keys, newVariable];
      setFormData({ ...formData, variable_keys: updated });
      setPreviewData({ ...previewData, [newVariable]: `[${newVariable}]` });
      setNewVariable('');
    }
  };

  const removeVariable = (key: string) => {
    setFormData({
      ...formData,
      variable_keys: formData.variable_keys.filter((k) => k !== key),
    });
    const { [key]: removed, ...rest } = previewData;
    setPreviewData(rest);
  };

  const getPreviewMessage = () => {
    let result = formData.content_pattern;
    formData.variable_keys.forEach((key, index) => {
      const placeholder = `{{${index + 1}}}`;
      const value = previewData[key] || `[${key}]`;
      result = result.split(placeholder).join(value);
    });
    return result;
  };

  const getPreviewSubject = () => {
    let result = formData.email_subject || '';
    formData.variable_keys.forEach((key, index) => {
      const placeholder = `{{${index + 1}}}`;
      const value = previewData[key] || `[${key}]`;
      result = result.split(placeholder).join(value);
    });
    return result;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Handle AI translation
  const handleTranslate = async () => {
    const result = await translate(
      {
        content_pattern: formData.content_pattern,
        email_subject: formData.email_subject,
      },
      SOURCE_LANGUAGE,
      formData.language
    );

    if (result) {
      setFormData(prev => ({
        ...prev,
        content_pattern: result.content_pattern,
        email_subject: result.email_subject || prev.email_subject,
      }));
    }
  };

  const canTranslate = formData.language !== SOURCE_LANGUAGE && formData.content_pattern.trim().length > 0;

  // Handle drag start for variable chips
  const handleDragStart = (e: React.DragEvent, key: string) => {
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Handle drop on content textarea
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setActiveDropTarget('content');
    const key = e.dataTransfer.getData('text/plain');
    if (key) {
      insertVariable(key);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setActiveDropTarget('content');
  };

  // Handle drop on email subject
  const handleSubjectDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setActiveDropTarget('subject');
    const key = e.dataTransfer.getData('text/plain');
    if (key) {
      insertVariableToSubject(key);
    }
  };

  const handleSubjectDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setActiveDropTarget('subject');
  };

  // Handle variable click - insert to active target
  const handleVariableClick = (key: string) => {
    if (activeDropTarget === 'subject' && showEmailFields) {
      insertVariableToSubject(key);
    } else {
      insertVariable(key);
    }
  };

  // Get filtered variables based on category
  const getFilteredVariables = () => {
    if (showAllVariables) {
      return SYSTEM_VARIABLES;
    }
    const allowedKeys = CATEGORY_VARIABLES[formData.category] || CATEGORY_VARIABLES.general;
    return SYSTEM_VARIABLES.filter(v => allowedKeys.includes(v.key));
  };

  const filteredVariables = getFilteredVariables();

  const showWhatsAppFields = formData.channel_type === 'whatsapp' || formData.channel_type === 'both';
  const showEmailFields = formData.channel_type === 'email' || formData.channel_type === 'both';


  return {
    textareaRef, emailSubjectRef, formData, setFormData,
    newVariable, setNewVariable, previewData, setPreviewData,
    showAllVariables, setShowAllVariables, activeDropTarget, setActiveDropTarget,
    isTranslating, canTranslate,
    insertVariable, insertVariableToSubject, addVariable, removeVariable,
    getPreviewMessage, getPreviewSubject, handleSubmit, handleTranslate,
    handleDragStart, handleDrop, handleDragOver, handleSubjectDrop, handleSubjectDragOver,
    handleVariableClick, filteredVariables, showWhatsAppFields, showEmailFields
  };
}
