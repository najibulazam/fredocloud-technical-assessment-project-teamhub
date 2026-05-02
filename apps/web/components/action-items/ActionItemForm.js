"use client";

import { useForm } from "react-hook-form";

export default function ActionItemForm({ members = [], goals = [], onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      title: "",
      assigneeId: "",
      priority: "MEDIUM",
      dueDate: "",
      goalId: ""
    }
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Action item title"
          {...register("title", { required: true })}
        />
        {errors.title && <p className="mt-1 text-xs text-rose-400">Title is required</p>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          {...register("assigneeId")}
        >
          <option value="">Assign to</option>
          {members.map((member) => (
            <option key={member.userId} value={String(member.userId)}>
              {member.user?.name || member.user?.email || "Member"}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          {...register("priority")}
        >
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="URGENT">URGENT</option>
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          type="date"
          {...register("dueDate")}
        />
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          {...register("goalId")}
        >
          <option value="">Link to goal</option>
          {goals.map((goal) => (
            <option key={goal.id} value={String(goal.id)}>
              {goal.title}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" type="submit">
          Create Action Item
        </button>
      </div>
    </form>
  );
}
