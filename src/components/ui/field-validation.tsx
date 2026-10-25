"use client";

import { useState, type FormEvent } from "react";

type ValidatableField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type FieldErrors = Record<string, string>;

function isValidatableField(value: EventTarget): value is ValidatableField {
  return value instanceof HTMLInputElement || value instanceof HTMLSelectElement || value instanceof HTMLTextAreaElement;
}

function fieldKey(field: ValidatableField) {
  return field.name || field.id;
}

export function useFieldValidation() {
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleInvalid(event: FormEvent<HTMLFormElement>) {
    const field = event.target;
    if (!isValidatableField(field)) return;
    const key = fieldKey(field);
    if (!key) return;
    event.preventDefault();
    setErrors((current) => ({ ...current, [key]: field.validationMessage }));
  }

  function handleInput(event: FormEvent<HTMLFormElement>) {
    const field = event.target;
    if (!isValidatableField(field)) return;
    const key = fieldKey(field);
    if (!key) return;
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      if (field.validity.valid) delete next[key];
      else next[key] = field.validationMessage;
      return next;
    });
  }

  function setFieldError(key: string, message: string) {
    setErrors((current) => ({ ...current, [key]: message }));
  }

  function clearErrors() {
    setErrors({});
  }

  return { errors, handleInvalid, handleInput, setFieldError, clearErrors };
}

export function FieldError({ error, id }: { error?: string; id: string }) {
  return error ? <small className="field-error" id={id} role="alert">{error}</small> : null;
}
