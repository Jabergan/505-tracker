import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, parseMoney } from "@/lib/tracker/format";
import { cn } from "@/lib/utils";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </label>
  );
}

export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className,
      )}
      {...props}
    />
  );
}

export function MoneyField({
  label,
  valueCents,
  onChange,
  allowNegative = false,
}: {
  label: string;
  valueCents: number;
  onChange: (cents: number) => void;
  allowNegative?: boolean;
}) {
  const [text, setText] = useState(() => formatEdit(valueCents));
  useEffect(() => {
    setText(formatEdit(valueCents));
  }, [valueCents]);

  return (
    <Field label={label}>
      <Input
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const nextText = e.target.value;
          setText(nextText);
          const parsed = parseMoney(nextText);
          if (parsed === null) return;
          onChange(allowNegative ? parsed : Math.max(0, parsed));
        }}
        onBlur={() => {
          const parsed = parseMoney(text);
          if (parsed === null) {
            setText(formatEdit(valueCents));
            return;
          }
          const next = allowNegative ? parsed : Math.max(0, parsed);
          onChange(next);
          setText(formatEdit(next));
        }}
        className="font-mono tabular-nums"
      />
    </Field>
  );
}

function formatEdit(cents: number): string {
  return formatMoney(cents).replace("$", "");
}

export function NotesField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Notes">
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
    </Field>
  );
}
