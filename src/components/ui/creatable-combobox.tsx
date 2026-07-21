import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '@/components/ui/command';

interface CreatableComboboxProps {
	value: string;
	onChange: (value: string) => void;
	suggestions: string[];
	placeholder?: string;
	emptyPlaceholder?: string;
	id?: string;
}

export const CreatableCombobox: React.FC<CreatableComboboxProps> = ({
	value,
	onChange,
	suggestions,
	placeholder = 'Wählen oder neu anlegen',
	emptyPlaceholder = 'Nicht gesetzt',
	id
}) => {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');

	const trimmedQuery = query.trim();
	const queryMatchesExisting = suggestions.some(
		(s) => s.toLowerCase() === trimmedQuery.toLowerCase()
	);

	const commit = (next: string) => {
		onChange(next);
		setQuery('');
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between font-normal tracking-normal">
					<span className={cn('truncate', !value && 'text-muted-foreground')}>
						{value || emptyPlaceholder}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] p-0"
				align="start">
				<Command>
					<CommandInput
						placeholder={placeholder}
						value={query}
						onValueChange={setQuery}
					/>
					<CommandList>
						{trimmedQuery && !queryMatchesExisting && (
							<CommandGroup>
								<CommandItem
									value={`__create__:${trimmedQuery}`}
									onSelect={() => commit(trimmedQuery)}>
									<Plus className="mr-2 h-4 w-4" />
									"{trimmedQuery}" anlegen
								</CommandItem>
							</CommandGroup>
						)}
						{value && (
							<CommandGroup>
								<CommandItem value="__clear__" onSelect={() => commit('')}>
									{emptyPlaceholder}
								</CommandItem>
							</CommandGroup>
						)}
						<CommandGroup>
							{suggestions.map((s) => (
								<CommandItem key={s} value={s} onSelect={() => commit(s)}>
									<Check
										className={cn(
											'mr-2 h-4 w-4',
											value.toLowerCase() === s.toLowerCase() ? 'opacity-100' : 'opacity-0'
										)}
									/>
									{s}
								</CommandItem>
							))}
						</CommandGroup>
						{!trimmedQuery && suggestions.length === 0 && (
							<CommandEmpty>Keine Vorschläge — einfach tippen.</CommandEmpty>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};
