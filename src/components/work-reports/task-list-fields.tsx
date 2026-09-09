"use client";

import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AutocompleteInput } from "@/components/work-reports/autocomplete-input";
import type { WorkReportInput } from "@/lib/validations/work-report";

type TasksFieldName = "tasks" | `wfhDays.${number}.tasks`;
type TaskField = "task" | "projectName" | "assignedBy";
type TaskValue = { task: string; projectName?: string; assignedBy?: string };

interface TaskListFieldsProps {
  name: TasksFieldName;
  projectSuggestions: string[];
  isLoadingProjectSuggestions: boolean;
  assignedBySuggestions: string[];
  isLoadingAssignedBySuggestions: boolean;
}

function isMixed(tasks: TaskValue[]) {
  if (tasks.length < 2) return false;
  const key = (t: TaskValue) => `${t.projectName ?? ""}|${t.assignedBy ?? ""}`;
  return tasks.some((t) => key(t) !== key(tasks[0]));
}

export function TaskListFields({
  name,
  projectSuggestions,
  isLoadingProjectSuggestions,
  assignedBySuggestions,
  isLoadingAssignedBySuggestions,
}: TaskListFieldsProps) {
  const form = useFormContext<WorkReportInput>();
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name });
  const tasks = (useWatch({ control: form.control, name }) ?? []) as TaskValue[];
  // Until the user picks a mode, follow the data: a report whose tasks already
  // differ opens in per-task mode, everything else in shared mode.
  const [modeOverride, setModeOverride] = useState<boolean | null>(null);
  const perTask = modeOverride ?? isMixed(tasks);

  // The row currently being dragged, and the one row allowed to start a drag —
  // only the grip arms it, so text stays selectable inside the inputs.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [armedIndex, setArmedIndex] = useState<number | null>(null);

  const endDrag = () => {
    setDragIndex(null);
    setArmedIndex(null);
  };

  // All three task keys are string fields, so one concrete path type covers them.
  const path = (index: number, key: TaskField) =>
    `${name}.${index}.${key}` as `tasks.${number}.task`;

  const sharedProject = tasks[0]?.projectName ?? "";
  const sharedAssignedBy = tasks[0]?.assignedBy ?? "";

  const applyToAll = (key: "projectName" | "assignedBy", value: string) => {
    fields.forEach((_, index) => form.setValue(path(index, key), value, { shouldDirty: true }));
  };

  const addTask = () => {
    const last = tasks[tasks.length - 1];
    append({
      task: "",
      projectName: last?.projectName ?? "",
      assignedBy: last?.assignedBy ?? "",
    });
  };

  const togglePerTask = (checked: boolean) => {
    setModeOverride(checked);
    if (!checked) {
      applyToAll("projectName", sharedProject);
      applyToAll("assignedBy", sharedAssignedBy);
    }
  };

  const dayIndex = name === "tasks" ? null : Number(name.split(".")[1]);
  const arrayError =
    dayIndex === null ? form.formState.errors.tasks : form.formState.errors.wfhDays?.[dayIndex]?.tasks;
  const arrayMessage = (arrayError as { message?: string } | undefined)?.message;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Tasks</Label>
        <Label className="gap-2 text-xs font-normal text-muted-foreground">
          <Checkbox checked={perTask} onCheckedChange={(v) => togglePerTask(v === true)} />
          Different project / assigned by per task
        </Label>
      </div>

      {!perTask && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed p-2 sm:flex-row">
          <div className="flex-1">
            <AutocompleteInput
              value={sharedProject}
              onChange={(v) => applyToAll("projectName", v)}
              placeholder="Project name — all tasks"
              suggestions={projectSuggestions}
              isLoadingSuggestions={isLoadingProjectSuggestions}
            />
          </div>
          <div className="flex-1">
            <AutocompleteInput
              value={sharedAssignedBy}
              onChange={(v) => applyToAll("assignedBy", v)}
              placeholder="Assigned by — all tasks"
              suggestions={assignedBySuggestions}
              isLoadingSuggestions={isLoadingAssignedBySuggestions}
            />
          </div>
        </div>
      )}

      {fields.map((item, index) => (
        <div
          key={item.id}
          draggable={armedIndex === index}
          onDragStart={(event) => {
            setDragIndex(index);
            event.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (dragIndex === null || dragIndex === index) return;
            // Reorder as the pointer passes each row, so the list previews the drop.
            move(dragIndex, index);
            setDragIndex(index);
          }}
          onDragEnd={endDrag}
          onDrop={endDrag}
          className={cn(
            "flex items-start gap-1.5 rounded-md transition-opacity",
            dragIndex === index && "opacity-40"
          )}
        >
          <button
            type="button"
            aria-label={`Drag task ${index + 1} to reorder`}
            // Arming on press keeps the draggable attribute off the row until the
            // grip is actually grabbed.
            onPointerDown={() => setArmedIndex(index)}
            onPointerUp={() => setArmedIndex(null)}
            className="mt-1.5 cursor-grab rounded-sm p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
          <span className="mt-2 w-4 shrink-0 text-sm text-muted-foreground">{index + 1}.</span>
          <div className="flex flex-1 flex-col gap-2">
            <FormField
              control={form.control}
              name={path(index, "task")}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Task" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {perTask && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <FormField
                  control={form.control}
                  name={path(index, "projectName")}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <AutocompleteInput
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder="Project name"
                          suggestions={projectSuggestions}
                          isLoadingSuggestions={isLoadingProjectSuggestions}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={path(index, "assignedBy")}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <AutocompleteInput
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder="Assigned by"
                          suggestions={assignedBySuggestions}
                          isLoadingSuggestions={isLoadingAssignedBySuggestions}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
          <div className="mt-0.5 flex shrink-0 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => move(index, index - 1)}
              disabled={index === 0}
            >
              <ChevronUp className="size-4" />
              <span className="sr-only">Move task up</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => move(index, index + 1)}
              disabled={index === fields.length - 1}
            >
              <ChevronDown className="size-4" />
              <span className="sr-only">Move task down</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Remove task</span>
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addTask}>
        <Plus className="size-4" />
        Add task
      </Button>

      {arrayMessage && <p className="text-sm text-destructive">{arrayMessage}</p>}
    </div>
  );
}
