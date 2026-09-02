"use client"

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { FormField, FormFieldType } from '@/lib/types';
import { useEventForm, useCreateForm, useUpdateForm } from '@/hooks/useForms';

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  short_text: 'Short text',
  long_text: 'Long text',
  email: 'Email',
  phone: 'Phone',
  number: 'Number',
  single_select: 'Single choice',
  multi_select: 'Multiple choice',
  date: 'Date',
};

const SELECT_TYPES: FormFieldType[] = ['single_select', 'multi_select'];

function emptyField(order: number): FormField {
  return { id: uuidv4(), type: 'short_text', label: '', required: false, order };
}

interface EventFormBuilderProps {
  eventId: string;
}

export function EventFormBuilder({ eventId }: EventFormBuilderProps) {
  const { data, isLoading } = useEventForm(eventId);
  const createForm = useCreateForm(eventId);
  const updateForm = useUpdateForm(eventId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [copied, setCopied] = useState(false);
  const [loadedFormId, setLoadedFormId] = useState<string | null>(null);

  const existingForm = data?.form ?? null;

  // Sync local editable state once when the server-side form first loads
  // (or changes to a different form) — adjusting state during render per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (existingForm && existingForm.id !== loadedFormId) {
    setLoadedFormId(existingForm.id);
    setTitle(existingForm.title);
    setDescription(existingForm.description ?? '');
    setFields(existingForm.fields);
  }

  const addField = () => setFields(prev => [...prev, emptyField(prev.length)]);

  const removeField = (id: string) =>
    setFields(prev => prev.filter(f => f.id !== id).map((f, i) => ({ ...f, order: i })));

  const moveField = (index: number, direction: -1 | 1) => {
    setFields(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((f, i) => ({ ...f, order: i }));
    });
  };

  const updateField = (id: string, patch: Partial<FormField>) =>
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));

  const addOption = (fieldId: string) =>
    setFields(prev => prev.map(f =>
      f.id === fieldId
        ? { ...f, options: [...(f.options ?? []), { id: uuidv4(), label: '' }] }
        : f
    ));

  const updateOption = (fieldId: string, optionId: string, label: string) =>
    setFields(prev => prev.map(f =>
      f.id === fieldId
        ? { ...f, options: (f.options ?? []).map(o => (o.id === optionId ? { ...o, label } : o)) }
        : f
    ));

  const removeOption = (fieldId: string, optionId: string) =>
    setFields(prev => prev.map(f =>
      f.id === fieldId
        ? { ...f, options: (f.options ?? []).filter(o => o.id !== optionId) }
        : f
    ));

  const handleCreate = async () => {
    try {
      await createForm.mutateAsync({ title, description, fields });
      toast.success('Form created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create form');
    }
  };

  const handleSave = async () => {
    try {
      await updateForm.mutateAsync({ title, description, fields });
      toast.success('Form saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save form');
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    try {
      await updateForm.mutateAsync({ isActive });
      toast.success(isActive ? 'Form published' : 'Form unpublished');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update form');
    }
  };

  const copyLink = () => {
    if (!existingForm) return;
    const url = `${window.location.origin}/f/${existingForm.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading form...</div>;
  }

  if (!existingForm && fields.length === 0 && !title) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-muted-foreground">This event doesn&apos;t have a data-capture form yet.</p>
        <Button onClick={() => setFields([emptyField(0)])}>
          <Plus className="h-4 w-4 mr-2" /> Create a form
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {existingForm && (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Switch checked={existingForm.isActive} onCheckedChange={handleToggleActive} />
            <span className="text-sm font-medium">
              {existingForm.isActive ? 'Accepting responses' : 'Not published'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
            {copied ? 'Copied' : 'Copy public link'}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Form title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Volunteer Sign-up" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Description (optional)</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Shown at the top of the public form" />
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <Card key={field.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label>Question label</Label>
                  <Input
                    value={field.label}
                    onChange={e => updateField(field.id, { label: e.target.value })}
                    placeholder="e.g. Full name"
                  />
                </div>
                <div className="flex flex-col gap-1.5 w-40">
                  <Label>Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(v: FormFieldType) => updateField(field.id, { type: v, options: SELECT_TYPES.includes(v) ? (field.options ?? [{ id: uuidv4(), label: '' }]) : undefined })}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {SELECT_TYPES.includes(field.type) && (
                <div className="space-y-2 pl-2 border-l-2">
                  <Label className="text-xs text-muted-foreground">Options</Label>
                  {(field.options ?? []).map(opt => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <Input
                        value={opt.label}
                        onChange={e => updateOption(field.id, opt.id, e.target.value)}
                        placeholder="Option label"
                      />
                      <Button variant="ghost" size="icon-sm" onClick={() => removeOption(field.id, opt.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addOption(field.id)}>
                    <Plus className="h-4 w-4 mr-1.5" /> Add option
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={field.required}
                    onChange={e => updateField(field.id, { required: e.target.checked })}
                  />
                  Required
                </label>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => moveField(index, -1)} disabled={index === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => removeField(field.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={addField}>
        <Plus className="h-4 w-4 mr-2" /> Add question
      </Button>

      <div className="flex justify-end pt-2">
        <Button
          onClick={existingForm ? handleSave : handleCreate}
          disabled={createForm.isPending || updateForm.isPending || !title || fields.length === 0}
        >
          {(createForm.isPending || updateForm.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {existingForm ? 'Save form' : 'Create form'}
        </Button>
      </div>
    </div>
  );
}
