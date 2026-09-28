import React from "react";
import * as Icons from "lucide-react";

interface DynamicIconProps {
  name?: string | null;
  className?: string;
  size?: number;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className = "w-5 h-5", size }) => {
  if (!name) return <Icons.HelpCircle className={className} size={size} />;
  
  const IconComponent = (Icons as any)[name] || Icons.CircleDollarSign;
  return <IconComponent className={className} size={size} />;
};
