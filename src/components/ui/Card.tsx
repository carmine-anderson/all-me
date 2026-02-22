import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevated, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-surface-border p-4',
        elevated ? 'bg-surface-elevated shadow-lg' : 'bg-surface-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
Card.displayName = 'Card'

export const CardHeader = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4 flex items-center justify-between', className)} {...props}>
    {children}
  </div>
)

export const CardTitle = ({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-sm font-semibold text-zinc-100', className)} {...props}>
    {children}
  </h3>
)
