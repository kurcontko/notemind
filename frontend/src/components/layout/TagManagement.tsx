import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, X, Tag as TagIcon } from 'lucide-react';

const TagManagement = ({ tags = [], onTagsChange, isEditing, tagSize }) => {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const handleAddTag = (value) => {
    const formattedTag = value.trim().toLowerCase().replace(/^#/, '');
    if (formattedTag && !tags.includes(formattedTag)) {
      onTagsChange([...tags, formattedTag]);
    }
    setOpen(false);
    setInputValue('');
  };

  const handleRemoveTag = (tagToRemove) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-col gap-2">
      {isEditing && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" side="right" align="start">
            <Command>
              <CommandInput 
                placeholder="Enter tag name..."
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandEmpty>No matching tags</CommandEmpty>
              <CommandGroup>
                {inputValue && (
                  <CommandItem
                    value={inputValue}
                    onSelect={handleAddTag}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add "{inputValue}"
                  </CommandItem>
                )}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      <div className={`flex flex-wrap gap-2 ${tagSize === 'small' ? 'text-xs font-normal' : 'text-sm font-bold'}`}>
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className={`flex items-center gap-1 px-2 py-0.5 ${tagSize === 'small' ? 'text-xs font-normal' : 'text-sm font-bold'}`}
          >
            <TagIcon className="h-3 w-3 opacity-70" />
            {tag}
            {isEditing && (
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {tags.length === 0 && !isEditing && (
          <span className="text-sm text-muted-foreground">No tags</span>
        )}
      </div>
    </div>
  );
};

export default TagManagement;