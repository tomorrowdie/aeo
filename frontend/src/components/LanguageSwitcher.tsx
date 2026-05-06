'use client';

import { Language } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LanguageSwitcher({ 
  currentLang, 
  setLang 
}: { 
  currentLang: Language; 
  setLang: (l: Language) => void 
}) {
  return (
    <Select value={currentLang} onValueChange={(val) => setLang(val as Language)}>
      <SelectTrigger className="w-[120px] bg-transparent border-border text-xs">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent className="bg-card border-border text-foreground">
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="zh-HK">繁體中文</SelectItem>
        <SelectItem value="zh-CN">简体中文</SelectItem>
      </SelectContent>
    </Select>
  );
}
