'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES, parsePhone, findCountryByIso } from '@/lib/phone';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  /** Full international digits (dial code + national), e.g. "5511999999999". */
  value: string;
  /** Called with the full international digits whenever the country or number changes. */
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function PhoneInput({ value, onChange, id, className, disabled }: PhoneInputProps) {
  // Derive the country + national number from the stored value.
  const parsed = React.useMemo(() => parsePhone(value), [value]);
  const [iso, setIso] = React.useState(parsed.country.iso);

  // Keep the selected country in sync if the value is replaced externally
  // (e.g. opening the edit dialog for another person).
  React.useEffect(() => {
    setIso(parsed.country.iso);
  }, [parsed.country.iso]);

  const country = findCountryByIso(iso);
  const national = parsed.national;

  const emit = (nextIso: string, nextNational: string) => {
    const c = findCountryByIso(nextIso);
    const cleaned = nextNational.replace(/\D/g, '').slice(0, c.maxNational);
    onChange(cleaned ? c.dial + cleaned : '');
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <Select
        value={iso}
        disabled={disabled}
        onValueChange={(nextIso) => {
          setIso(nextIso);
          emit(nextIso, national);
        }}
      >
        <SelectTrigger
          aria-label="País"
          className="bg-surface-elevated border-border text-foreground h-11 w-[92px] shrink-0 rounded-xl"
        >
          <SelectValue>
            <span className="flex items-center gap-1">
              <span className="text-base leading-none">{country.flag}</span>
              <span className="text-sm">+{country.dial}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-surface border-border max-h-72">
          {COUNTRIES.map((c) => (
            <SelectItem key={c.iso} value={c.iso} className="text-foreground">
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">{c.flag}</span>
                <span>{c.name}</span>
                <span className="text-muted-foreground">+{c.dial}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        disabled={disabled}
        value={country.format(national)}
        placeholder={country.placeholder}
        onChange={(e) => emit(iso, e.target.value)}
        className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground h-11 flex-1 rounded-xl"
      />
    </div>
  );
}
