import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Users, Mail, MessageCircle, Smartphone, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { STAKEHOLDER_ROLES, SEVERITY_LEVELS, CHANNELS, StakeholderRole } from '@/features/notifications';
import { RuleFormState } from '../types';
import { SEVERITY_COLORS } from '../utils';
import { ChannelIcon } from './ChannelIcon';

export interface RuleFormFieldsProps {
  formState: RuleFormState;
  setFormState: React.Dispatch<React.SetStateAction<RuleFormState>>;
  users: { id: string; full_name: string | null; job_title?: string | null;[key: string]: unknown }[];
  getRoleLabel: (role: string) => string;
  getSeverityLabel: (level: string) => string;
  emailTemplates: { id: string; slug: string; language: string;[key: string]: unknown }[];
  whatsappTemplates: { id: string; slug: string; language: string;[key: string]: unknown }[];
  pushTemplates: { id: string; slug: string; language: string;[key: string]: unknown }[];
}

export function RuleFormFields({
  formState,
  setFormState,
  users,
  getRoleLabel,
  getSeverityLabel,
  emailTemplates,
  whatsappTemplates,
  pushTemplates
}: RuleFormFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 py-4">
      {/* Section 1: Recipient Type */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-primary rounded-full" />
          <h4 className="text-sm font-semibold text-foreground">
            {t('settings.notificationMatrix.recipientType', 'Recipient Type')}
          </h4>
        </div>

        <div className="flex gap-4 ps-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="recipientType"
              checked={!formState.isUserSpecific}
              onChange={() => setFormState(prev => ({
                ...prev,
                isUserSpecific: false,
                user_id: null,
              }))}
              className="h-4 w-4 text-primary"
            />
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t('settings.notificationMatrix.roleBased', 'Role-based')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="recipientType"
              checked={formState.isUserSpecific}
              onChange={() => setFormState(prev => ({
                ...prev,
                isUserSpecific: true,
                stakeholder_role: '',
              }))}
              className="h-4 w-4 text-primary"
            />
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t('settings.notificationMatrix.userSpecific', 'User-specific')}</span>
          </label>
        </div>

        <div className="ps-3">
          {formState.isUserSpecific ? (
            <Select
              value={formState.user_id || ''}
              onValueChange={(value) => setFormState(prev => ({ ...prev, user_id: value }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t('settings.notificationMatrix.selectUserPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} {user.job_title && `(${user.job_title})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={formState.stakeholder_role}
              onValueChange={(value) => setFormState(prev => ({
                ...prev,
                stakeholder_role: value as StakeholderRole
              }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t('settings.notificationMatrix.selectRolePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {STAKEHOLDER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {getRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Separator />

      {/* Section 2: Severity Range */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-primary rounded-full" />
          <h4 className="text-sm font-semibold text-foreground">
            {t('settings.notificationMatrix.severityRange', 'Severity Range')}
          </h4>
        </div>

        <div className="flex items-center gap-3 ps-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {t('common.from', 'From')}
            </Label>
            <Select
              value={formState.severity_from}
              onValueChange={(value) => setFormState(prev => ({
                ...prev,
                severity_from: value as typeof SEVERITY_LEVELS[number]
              }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_LEVELS.map((level) => {
                  const colors = SEVERITY_COLORS[level];
                  return (
                    <SelectItem key={level} value={level}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', colors.bg, colors.text)} />
                        {getSeverityLabel(level)}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground mt-5" />
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {t('common.to', 'To')}
            </Label>
            <Select
              value={formState.severity_to}
              onValueChange={(value) => setFormState(prev => ({
                ...prev,
                severity_to: value as typeof SEVERITY_LEVELS[number]
              }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_LEVELS.map((level) => {
                  const colors = SEVERITY_COLORS[level];
                  return (
                    <SelectItem key={level} value={level}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', colors.bg, colors.text)} />
                        {getSeverityLabel(level)}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Section 3: Notification Channels */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-primary rounded-full" />
          <h4 className="text-sm font-semibold text-foreground">
            {t('settings.notificationMatrix.channelsLabel', 'Notification Channels')}
          </h4>
        </div>

        <div className="flex gap-6 ps-3 flex-wrap">
          {CHANNELS.map((channel) => (
            <label key={channel} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                id={`channel_${channel}`}
                checked={formState.channels.includes(channel)}
                onCheckedChange={(checked) => setFormState(prev => ({
                  ...prev,
                  channels: checked
                    ? [...prev.channels, channel]
                    : prev.channels.filter(c => c !== channel)
                }))}
              />
              <ChannelIcon channel={channel} active={formState.channels.includes(channel)} size="md" />
              <span className={cn(
                "text-sm transition-colors",
                formState.channels.includes(channel) ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {t(`settings.notificationMatrix.channels.${channel}`)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Section 4: Templates (conditional) */}
      {(formState.channels.includes('whatsapp') || formState.channels.includes('email')) && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-primary rounded-full" />
              <h4 className="text-sm font-semibold text-foreground">
                {t('settings.notificationMatrix.templates', 'Message Templates')}
              </h4>
            </div>

            <div className="space-y-4 ps-3">
              {formState.channels.includes('email') && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {t('settings.notificationMatrix.emailTemplate', 'Email Template')}
                  </Label>
                  <Select
                    value={formState.email_template_id || 'default'}
                    onValueChange={(value) => setFormState(prev => ({
                      ...prev,
                      email_template_id: value === 'default' ? null : value
                    }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t('settings.notificationMatrix.selectTemplate', 'Select template...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        {t('settings.notificationMatrix.defaultTemplate', 'Default System Template')}
                      </SelectItem>
                      {emailTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.slug} ({template.language})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formState.channels.includes('whatsapp') && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    {t('settings.notificationMatrix.whatsappTemplate', 'WhatsApp Template')}
                  </Label>
                  <Select
                    value={formState.whatsapp_template_id || 'default'}
                    onValueChange={(value) => setFormState(prev => ({
                      ...prev,
                      whatsapp_template_id: value === 'default' ? null : value
                    }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t('settings.notificationMatrix.selectTemplate', 'Select template...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        {t('settings.notificationMatrix.defaultTemplate', 'Default System Template')}
                      </SelectItem>
                      {whatsappTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.slug} ({template.language})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formState.channels.includes('push') && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    {t('settings.notificationMatrix.pushTemplate', 'Push Notification Template')}
                  </Label>
                  <Select
                    value={formState.push_template_id || 'default'}
                    onValueChange={(value) => setFormState(prev => ({
                      ...prev,
                      push_template_id: value === 'default' ? null : value
                    }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t('settings.notificationMatrix.selectTemplate', 'Select template...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        {t('settings.notificationMatrix.defaultTemplate', 'Default System Template')}
                      </SelectItem>
                      {pushTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.slug} ({template.language})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Section 5: Conditions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-primary rounded-full" />
          <h4 className="text-sm font-semibold text-foreground">
            {t('settings.notificationMatrix.conditionLabel', 'Conditions')}
          </h4>
        </div>

        <div className="ps-3">
          <Select
            value={formState.condition_type || 'none'}
            onValueChange={(value) => setFormState(prev => ({
              ...prev,
              condition_type: value === 'none' ? null : value
            }))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {t('settings.notificationMatrix.noCondition', 'No condition (always notify)')}
              </SelectItem>
              <SelectItem value="injury">
                {t('settings.notificationMatrix.conditions.injury', 'Only when injury reported')}
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1.5">
            {t('settings.notificationMatrix.conditionHelp', 'Conditions filter when notifications are sent')}
          </p>
        </div>
      </div>
    </div>
  );
}
