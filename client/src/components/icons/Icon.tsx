import type { FC, SVGProps } from 'react';
import { cn } from '../../utils';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizeMap: Record<IconSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
  '2xl': 'h-10 w-10',
};

interface IconWrapperProps {
  size?: IconSize;
  className?: string;
  label?: string;
  children: React.ReactNode;
}

export function IconWrapper({ size = 'md', className, label, children }: IconWrapperProps) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', sizeMap[size], className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={!label}
    >
      {children}
    </span>
  );
}

interface IconProps {
  size?: IconSize;
  className?: string;
  label?: string;
}

type LucideIcon = FC<SVGProps<SVGSVGElement>>;

export function withLabel(Icon: LucideIcon, defaultLabel: string) {
  const Wrapped: FC<IconProps> = ({ size = 'md', className, label }) => (
    <IconWrapper size={size} className={className} label={label || defaultLabel}>
      <Icon className="h-full w-full" />
    </IconWrapper>
  );
  Wrapped.displayName = `Icon(${defaultLabel})`;
  return Wrapped;
}
