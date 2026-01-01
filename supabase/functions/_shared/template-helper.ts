/**
 * Helper to fetch and render notification templates from database
 */

interface TemplateResult {
  content: string;
  found: boolean;
  templateId?: string;
}

/**
 * Fetches a notification template by slug and renders it with variables
 */
export async function getRenderedTemplate(
  supabase: any,
  tenantId: string,
  slug: string,
  variables: Record<string, string>
): Promise<TemplateResult> {
  try {
    // Fetch template from database
    const { data: template, error } = await supabase
      .from('notification_templates')
      .select('id, content_pattern')
      .eq('tenant_id', tenantId)
      .eq('slug', slug)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error || !template) {
      console.log(`[Template] Template '${slug}' not found for tenant ${tenantId}`);
      return { content: '', found: false };
    }

    // Replace variables in template using {{variable}} syntax
    let content = template.content_pattern;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value || '');
    }

    console.log(`[Template] Rendered template '${slug}' successfully`);
    return { 
      content, 
      found: true,
      templateId: template.id 
    };
  } catch (err) {
    console.error(`[Template] Error fetching template '${slug}':`, err);
    return { content: '', found: false };
  }
}

/**
 * Fetches multiple templates at once for efficiency
 */
export async function getTemplatesByCategory(
  supabase: any,
  tenantId: string,
  category: string
): Promise<Array<{ slug: string; content_pattern: string; variable_keys: string[] }>> {
  try {
    const { data: templates, error } = await supabase
      .from('notification_templates')
      .select('slug, content_pattern, variable_keys')
      .eq('tenant_id', tenantId)
      .eq('category', category)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (error) {
      console.error(`[Template] Error fetching templates for category '${category}':`, error);
      return [];
    }

    return templates || [];
  } catch (err) {
    console.error(`[Template] Error fetching templates:`, err);
    return [];
  }
}
