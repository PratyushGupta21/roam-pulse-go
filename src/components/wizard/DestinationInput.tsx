import { MapPin, X } from "lucide-react";
import { useMemo, useState } from "react";

import { DESTINATION_SUGGESTIONS } from "@/lib/domain";
import { inputClass } from "./WizardPrimitives";

export function DestinationInput({
  id,
  value,
  placeholder,
  onChange,
  onPick,
  onClear,
}: {
  id: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onPick?: (suggestion: { city: string; country: string }) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    const list = DESTINATION_SUGGESTIONS.filter(
      (s) => !query || s.city.toLowerCase().includes(query) || s.country.toLowerCase().includes(query),
    );
    return list.slice(0, 6);
  }, [value]);

  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-primary" />
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className={`${inputClass} pl-10 ${onClear ? "pr-10" : ""}`}
      />
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove destination"
          className="absolute right-2 top-2 cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {open && matches.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          {matches.map((s) => (
            <li key={`${s.city}-${s.country}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(s.city);
                  onPick?.({ city: s.city, country: s.country });
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium text-foreground">{s.city}</span>
                <span className="text-xs text-muted-foreground">{s.country}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
