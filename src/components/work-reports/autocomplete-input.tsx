"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useHiddenSuggestions } from "@/hooks/use-suggestions";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions: string[];
  isLoadingSuggestions?: boolean;
  // Names the list so each suggestion gets a × that hides it for good (past
  // records keep the value). Without it the list is read-only.
  removableAs?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  placeholder = "Type to search…",
  suggestions: allSuggestions,
  isLoadingSuggestions = false,
  removableAs,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const { hidden, hide } = useHiddenSuggestions(removableAs);
  const suggestions = allSuggestions.filter((item) => !hidden.includes(item));

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
  };

  // Filter suggestions based on input
  const filteredSuggestions = inputValue
    ? suggestions.filter((item) =>
        item.toLowerCase().includes(inputValue.toLowerCase())
      )
    : suggestions;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate text-left">
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-50 p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={handleInputChange}
          />
          {isLoadingSuggestions ? (
            <div className="p-2 text-sm text-muted-foreground">Loading…</div>
          ) : filteredSuggestions.length === 0 ? (
            <CommandEmpty>No suggestions found.</CommandEmpty>
          ) : (
            <CommandList>
              <CommandGroup>
                {filteredSuggestions.map((item) => (
                  <CommandItem
                    key={item}
                    value={item}
                    onSelect={() => handleSelect(item)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1 truncate">{item}</span>
                    {removableAs && (
                      <button
                        type="button"
                        // Its own click, not the row's: removing must not also pick it.
                        onClick={(e) => {
                          e.stopPropagation();
                          hide(item);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label={`Remove ${item} from suggestions`}
                        title="Remove from suggestions"
                        className="-mr-1 rounded-sm p-0.5 text-muted-foreground opacity-60 hover:bg-muted-foreground/15 hover:text-foreground hover:opacity-100"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
