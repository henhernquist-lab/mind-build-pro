import { Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Subject } from "@/lib/subjects";

export const SubjectPicker = ({ subjects, value, onChange, label }: { subjects: Subject[]; value: string; onChange: (id: string) => void; label?: string }) => (
  <div className="inline-flex items-center gap-1.5 text-xs">
    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
    <span className="text-muted-foreground">{label ?? "Subject:"}</span>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-auto text-xs px-2 border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.emoji} {s.label}</SelectItem>))}
      </SelectContent>
    </Select>
  </div>
);
