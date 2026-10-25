import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';

export interface ComboboxItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface ComboboxProps {
  items: ComboboxItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
}

export function Combobox({
  items,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No options found.',
  className,
  triggerClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedItem = items.find((item) => item.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-11 px-3.5 text-sm font-normal rounded-xl bg-background border-input hover:bg-muted/50 select-none cursor-pointer',
            triggerClassName
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedItem?.icon}
            <span className="truncate">{selectedItem ? selectedItem.label : placeholder}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('p-0 shadow-2xl rounded-xl border-border overflow-hidden', className)} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-56">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-2.5 px-3 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </div>
                  <Check
                    className={cn(
                      'h-4 w-4 text-[#00a884] shrink-0 ml-2',
                      value === item.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
