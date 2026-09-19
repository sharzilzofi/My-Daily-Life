interface LoadingStateProps {
  label?: string;
}

export default function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex h-full w-full items-center justify-center py-16">
      <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600 dark:border-neutral-700 dark:border-t-neutral-300" />
        {label}
      </div>
    </div>
  );
}
