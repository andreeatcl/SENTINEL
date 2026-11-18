const BASE =
  "inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap rounded-md border transition-colors disabled:opacity-40 disabled:pointer-events-none";

const VARIANTS = {
  primary: "bg-carbon-50 border-carbon-50 text-carbon-950 hover:bg-white",
  secondary:
    "bg-carbon-850 border-carbon-700 text-carbon-200 hover:bg-carbon-800 hover:border-carbon-600 hover:text-white",
  ghost:
    "bg-transparent border-transparent text-carbon-400 hover:bg-carbon-800 hover:text-white",
  danger:
    "bg-transparent border-transparent text-carbon-400 hover:bg-signal-red/10 hover:text-signal-red",
};

const SIZES = {
  sm: "h-9 md:h-7 px-2.5 text-xs",
  md: "h-10 md:h-9 px-3.5 text-sm",
};

export function buttonClass({
  variant = "secondary",
  size = "md",
  className = "",
} = {}) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export default function Button({
  variant,
  size,
  className,
  href,
  type = "button",
  children,
  ...rest
}) {
  const cls = buttonClass({ variant, size, className });
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({
  label,
  size = "md",
  className = "",
  children,
  ...rest
}) {
  const dim =
    size === "sm" ? "w-9 h-9 md:w-7 md:h-7" : "w-10 h-10 md:w-9 md:h-9";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`${dim} inline-flex items-center justify-center rounded-md text-carbon-400 hover:bg-carbon-800 hover:text-white transition-colors shrink-0 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
