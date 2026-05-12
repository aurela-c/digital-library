/**
 * Max-width content wrapper + horizontal padding for all breakpoints.
 * Use inside full-bleed sections for consistent alignment.
 */
export default function PageContainer({ children, className = "" }) {
  return (
    <div
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 ${className}`}
    >
      {children}
    </div>
  );
}
