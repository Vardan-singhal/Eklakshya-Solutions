import { BookOpen, Cpu, Globe, Layers, Smartphone, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import type { ServiceKind } from "@/data/siteData";

export const SERVICE_ICON: Record<ServiceKind, LucideIcon> = {
  web: Globe,
  app: Smartphone,
  software: Cpu,
  saas: Layers,
  catalogue: BookOpen,
  image: Sparkles,
  seo: TrendingUp,
};
