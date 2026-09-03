"use client"

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { usePublicForm, useSubmitPublicForm } from '@/hooks/usePublicForm';
import { buildSubmissionSchema } from '@/lib/validators/formSubmissionSchema';
import { FormField } from '@/lib/types';

type Answers = Record<string, string | string[]>;

function submittedKey(formId: string) {
  return `gatherly:form-submitted:${formId}`;
}

function FieldInput({
  field, value, onChange,
}: {
  field: FormField;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  switch (field.type) {
    case 'long_text':
    case 'anonymous_text':
      return <Textarea value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />;
    case 'email':
      return <Input type="email" value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />;
    case 'phone':
      return <Input type="tel" value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />;
    case 'number':
      return <Input type="number" value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />;
    case 'date':
      return <Input type="date" value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />;
    case 'single_select':
      return (
        <RadioGroup value={(value as string) ?? ''} onValueChange={onChange}>
          {(field.options ?? []).map(opt => (
            <div key={opt.id} className="flex items-center gap-2">
              <RadioGroupItem value={opt.id} id={`${field.id}-${opt.id}`} />
              <Label htmlFor={`${field.id}-${opt.id}`} className="font-normal">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    case 'multi_select': {
      const selected = (value as string[]) ?? [];
      return (
        <div className="space-y-2">
          {(field.options ?? []).map(opt => (
            <div key={opt.id} className="flex items-center gap-2">
              <Checkbox
                id={`${field.id}-${opt.id}`}
                checked={selected.includes(opt.id)}
                onCheckedChange={(checked) => {
                  onChange(checked ? [...selected, opt.id] : selected.filter(id => id !== opt.id));
                }}
              />
              <Label htmlFor={`${field.id}-${opt.id}`} className="font-normal">{opt.label}</Label>
            </div>
          ))}
        </div>
      );
    }
    default:
      return <Input value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />;
  }
}

export default function PublicFormPage() {
  const params = useParams<{ formId: string }>();
  const formId = params.formId;

  const { data, isLoading, isError } = usePublicForm(formId);
  const submit = useSubmitPublicForm(formId);

  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(submittedKey(formId)) === '1';
  });

  const fields = useMemo(() => (data?.status === 'active' ? data.fields : []), [data]);
  const schema = useMemo(() => buildSubmissionSchema(fields), [fields]);

  const setAnswer = (fieldId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    setErrors(prev => ({ ...prev, [fieldId]: '' }));
  };

  const handleSubmit = async () => {
    const parsed = schema.safeParse(answers);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      await submit.mutateAsync(parsed.data as Answers);
      localStorage.setItem(submittedKey(formId), '1');
      setSubmitted(true);
    } catch {
      // submit.error is rendered below
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Form not found</CardTitle>
            <CardDescription>This link may be incorrect or the form may have been removed.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (data.status === 'inactive') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>No longer accepting responses</CardTitle>
            <CardDescription>This form isn&apos;t currently open for submissions.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="items-center">
            <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Thanks for responding!</CardTitle>
            <CardDescription>Your submission has been recorded.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center p-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{data.title}</CardTitle>
          {data.eventTitle && <CardDescription>For {data.eventTitle}</CardDescription>}
          {data.description && <p className="text-sm text-muted-foreground pt-2">{data.description}</p>}
        </CardHeader>
        <CardContent className="space-y-5">
          {fields.map(field => (
            <div key={field.id} className="flex flex-col gap-1.5">
              <Label>
                {field.label}{field.required && <span className="text-destructive"> *</span>}
              </Label>
              {field.type === 'anonymous_text' && (
                <p className="text-xs text-muted-foreground">This answer is anonymous and can&apos;t be traced back to you.</p>
              )}
              <FieldInput
                field={field}
                value={answers[field.id]}
                onChange={value => setAnswer(field.id, value)}
              />
              {errors[field.id] && <p className="text-sm text-destructive">{errors[field.id]}</p>}
            </div>
          ))}

          {submit.isError && (
            <p className="text-sm text-destructive">
              {submit.error instanceof Error ? submit.error.message : 'Failed to submit. Please try again.'}
            </p>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={submit.isPending}>
            {submit.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
