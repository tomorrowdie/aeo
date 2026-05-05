'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

interface CopyButtonProps {
  content: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  label?: string;
}

export default function CopyButton({ content, className = '', variant = 'outline', label }: CopyButtonProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <Button 
      variant={variant} 
      onClick={handleCopy} 
      className={className}
      size="sm"
    >
      {copied ? t.copiedButton : (label || t.copyButton)}
    </Button>
  );
}
