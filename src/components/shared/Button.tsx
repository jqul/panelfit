import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium transition-all rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none'

    const variants = {
      primary: 'bg-ink text-card hover:opacity-90 active:scale-[0.98]',
      outline: 'border border-border bg-transparent text-ink hover:bg-bg-alt active:scale-[0.98]',
      ghost:   'bg-transparent text-muted hover:bg-bg-alt hover:text-ink active:scale-[0.98]',
      danger:  'bg-warn/10 border border-warn/30 text-warn hover:bg-warn hover:text-white active:scale-[0.98]',
    }

    const sizes = {
      sm: 'text-[11px] px-3 py-1.5 tracking-wide uppercase font-semibold',
      md: 'text-sm px-4 py-2.5',
      lg: 'text-base px-6 py-3',
    }

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
