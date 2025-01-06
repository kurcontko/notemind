import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// Example interface for the filters that your advanced search might need.
// Adjust as necessary for your project.
export interface SearchFilters {
  query: string;
  categories?: string[];
  tags?: string[];
  mode?: "basic" | "vector" | "hybrid";
  minSimilarity?: number;
}

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: SearchFilters) => void;
}

export function SearchPanel({ isOpen, onClose, onSearch }: SearchPanelProps) {
  // Local state for collecting filter inputs
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<"basic" | "vector" | "hybrid">(
    "basic"
  );
  const [minSimilarity, setMinSimilarity] = useState(0.7);

  // For demo: Hard-coded categories and tags
  // In a real app, you might fetch these from your API or receive them as props
  const mockCategories = ["Work", "Personal", "Finance", "Health"];
  const mockTags = ["Urgent", "Archived", "Todo", "ProjectX"];

  // Handle toggling tags in local state
  const handleTagCheck = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Called when user clicks the "Search" button
  const handleSubmit = () => {
    const filters: SearchFilters = {
      query: searchText,
      categories: selectedCategory ? [selectedCategory] : [],
      tags,
      mode: searchMode,
      minSimilarity: searchMode !== "basic" ? minSimilarity : undefined,
    };
    onSearch(filters);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(val) => !val && onClose()}>
      {/* 
        When `open={true}`, the panel is shown;
        We handle closing either by user swiping/clicking outside or 
        calling onClose().
      */}
      <SheetContent side="right" className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Advanced Search</SheetTitle>
          <SheetDescription>
            Filter notes by text, category, tags, or vector similarity.
          </SheetDescription>
        </SheetHeader>

        {/* BODY */}
        <div className="mt-4 flex flex-col gap-4">
          {/* Search Text */}
          <div>
            <Label htmlFor="searchText">Search Text</Label>
            <Input
              id="searchText"
              placeholder="e.g. finances, project plan..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="categorySelect">Category</Label>
            <Select
              onValueChange={(val) => setSelectedCategory(val)}
              value={selectedCategory}
            >
              <SelectTrigger id="categorySelect">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {mockCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-3 pt-1">
              {mockTags.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={tags.includes(tag)}
                    onCheckedChange={() => handleTagCheck(tag)}
                  />
                  <Label htmlFor={`tag-${tag}`}>{tag}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Search Mode */}
          <div>
            <Label>Search Mode</Label>
            <Select
              value={searchMode}
              onValueChange={(val) =>
                setSearchMode(val as "basic" | "vector" | "hybrid")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select search mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="vector">Vector</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Min Similarity - visible only for vector/hybrid */}
          {(searchMode === "vector" || searchMode === "hybrid") && (
            <div>
              <Label htmlFor="minSimilarity">Min Similarity</Label>
              <Input
                id="minSimilarity"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={minSimilarity}
                onChange={(e) => setMinSimilarity(parseFloat(e.target.value))}
              />
            </div>
          )}
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose} className="mr-2">
            Cancel
          </Button>
          <Button variant="default" onClick={handleSubmit}>
            Search
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
