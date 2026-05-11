import React, { useMemo } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isFontInstalled } from '../../lib/fontAvailability';

const AUTO_SENTINEL = '__auto__';

interface CjkFontOption {
  value: string;
  label: string;
}

const OPTIONS: CjkFontOption[] = [
  { value: '',                       label: 'Auto · 按主字体智能搭配' },
  { value: 'Sarasa Mono SC',         label: 'Sarasa Mono SC （更纱黑体 简）' },
  { value: 'Sarasa Mono TC',         label: 'Sarasa Mono TC （更纱黑体 繁）' },
  { value: 'Maple Mono CN',          label: 'Maple Mono CN' },
  { value: 'Source Han Mono SC',     label: 'Source Han Mono SC （思源等宽）' },
  { value: 'Noto Sans Mono CJK SC',  label: 'Noto Sans Mono CJK SC' },
  { value: 'LXGW WenKai Mono',       label: 'LXGW WenKai Mono （霞鹜文楷等宽）' },
  { value: 'PingFang SC',            label: 'PingFang SC （苹方）' },
  { value: 'Hiragino Sans GB',       label: 'Hiragino Sans GB （冬青黑体）' },
  { value: 'Microsoft YaHei UI',     label: 'Microsoft YaHei UI （微软雅黑）' },
  { value: 'SimSun',                 label: 'SimSun （宋体）' },
];

interface Props {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  disabled?: boolean;
}

export const TerminalCjkFontSelect: React.FC<Props> = ({
  value,
  onChange,
  className,
  disabled,
}) => {
  const matchedOption = OPTIONS.find((o) => o.value === value);
  const radixValue = value === '' ? AUTO_SENTINEL : (matchedOption?.value ?? value);
  const triggerLabel = matchedOption?.label ?? value;

  // "Auto" is always present; concrete fonts only appear when installed;
  // the currently-selected value (if any) is also always shown so users
  // can see and clear their setting even on a machine without the font.
  const visibleOptions = useMemo(
    () =>
      OPTIONS.filter(
        (opt) =>
          opt.value === '' ||
          opt.value === value ||
          isFontInstalled(opt.value),
      ),
    [value],
  );

  return (
    <SelectPrimitive.Root
      value={radixValue}
      onValueChange={(next) => onChange(next === AUTO_SENTINEL ? '' : next)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-9 items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
          className,
        )}
      >
        <SelectPrimitive.Value>
          <span style={{ fontFamily: value ? `"${value}", monospace` : undefined }}>
            {triggerLabel}
          </span>
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-[200000] max-h-80 min-w-[14rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1"
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
            <ChevronUp className="h-4 w-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1 h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]">
            {visibleOptions.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value || AUTO_SENTINEL}
                value={opt.value || AUTO_SENTINEL}
                className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>
                  <span style={{ fontFamily: opt.value ? `"${opt.value}", monospace` : undefined }}>
                    {opt.label}
                  </span>
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
};

export default TerminalCjkFontSelect;
