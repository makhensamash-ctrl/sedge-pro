import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useDefaultTemplate = (type: 'invoice' | 'quotation') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['default-template', type],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('type', type)
        .eq('is_default', true)
        .maybeSingle();

      if (error || !data) {
        return {
          template_data: {
            style: 'classic',
            colors: { primary: '#000000', secondary: '#666666', accent: '#3b82f6' },
            layout: 'standard'
          }
        };
      }

      return data;
    },
    enabled: !!user
  });
};