import { forwardRef, type InputHTMLAttributes } from "react";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, id, className, ...rest }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          className={`rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-900 dark:text-neutral-100 ${
            error ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } ${className ?? ""}`}
          {...rest}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export default FormInput;
