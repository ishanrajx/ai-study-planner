"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type StudyDay = {
  day: number;
  title: string;
  topics: string[];
  tasks: string[];
  estimatedHours: number;
};

type StudyPlan = {
  title: string;
  summary: string;
  totalDays: number;
  dailyHours: number;
  days: StudyDay[];
  revisionStrategy: string[];
};

type PlanRequest = {
  subject: string;
  examDate: string;
  hoursPerDay: number;
};

export default function Home() {
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState("2");

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [completedTasks, setCompletedTasks] = useState<
    Record<string, boolean>
  >({});

  const [lastRequest, setLastRequest] = useState<PlanRequest | null>(
    null
  );

  useEffect(() => {
    try {
      const savedPlan = localStorage.getItem("ai-study-plan");
      const savedTasks = localStorage.getItem("ai-study-progress");
      const savedRequest = localStorage.getItem("ai-study-request");

      if (savedPlan) {
        setPlan(JSON.parse(savedPlan));
      }

      if (savedTasks) {
        setCompletedTasks(JSON.parse(savedTasks));
      }

      if (savedRequest) {
        const request = JSON.parse(savedRequest);

        setLastRequest(request);
        setSubject(request.subject || "");
        setExamDate(request.examDate || "");
        setHoursPerDay(String(request.hoursPerDay ?? "2"));
      }
    } catch (error) {
      console.error("Failed to load saved data:", error);
    }
  }, []);

  function validateInputs(request: PlanRequest) {
    if (!request.subject.trim()) {
      return "Please enter a subject.";
    }

    if (!request.examDate) {
      return "Please select your exam date.";
    }

    const selectedDate = new Date(`${request.examDate}T00:00:00`);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      return "Please select a future exam date.";
    }

    if (
      !Number.isFinite(request.hoursPerDay) ||
      request.hoursPerDay <= 0 ||
      request.hoursPerDay > 12
    ) {
      return "Study time must be between 0.5 and 12 hours per day.";
    }

    return "";
  }

  async function generatePlan(request: PlanRequest) {
    const validationError = validateInputs(request);

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response. Please try again."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to generate your study plan."
        );
      }

      setPlan(data);
      setCompletedTasks({});
      setLastRequest(request);

      localStorage.setItem("ai-study-plan", JSON.stringify(data));
      localStorage.setItem(
        "ai-study-progress",
        JSON.stringify({})
      );
      localStorage.setItem(
        "ai-study-request",
        JSON.stringify(request)
      );
    } catch (err) {
      console.error("Study plan error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't generate your study plan. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await generatePlan({
      subject: subject.trim(),
      examDate,
      hoursPerDay: Number(hoursPerDay),
    });
  }

  async function retryGeneration() {
    if (!lastRequest) {
      setError("Please enter your study details first.");
      return;
    }

    await generatePlan(lastRequest);
  }

  function toggleTask(taskId: string) {
    setCompletedTasks((previous) => {
      const updated = {
        ...previous,
        [taskId]: !previous[taskId],
      };

      localStorage.setItem(
        "ai-study-progress",
        JSON.stringify(updated)
      );

      return updated;
    });
  }

  const totalTasks = useMemo(() => {
    if (!plan) return 0;

    return plan.days.reduce(
      (total, day) => total + day.tasks.length,
      0
    );
  }, [plan]);

  const completedCount = Object.values(completedTasks).filter(
    Boolean
  ).length;

  const progress =
    totalTasks > 0
      ? Math.round((completedCount / totalTasks) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <section className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            AI Study Planner
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Study smarter. Plan better.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400">
            Enter your subject, exam date, and available study time.
            Your AI-generated plan will turn that information into
            a practical study schedule.
          </p>
        </section>

        {/* Form */}
        <section
          aria-labelledby="planner-form-title"
          className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        >
          <h2 id="planner-form-title" className="sr-only">
            Create your study plan
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid gap-5 md:grid-cols-3"
          >
            <div>
              <label
                htmlFor="subject"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Subject
              </label>

              <input
                id="subject"
                name="subject"
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. Computer Networks"
                disabled={loading}
                required
                aria-required="true"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="examDate"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Exam date
              </label>

              <input
                id="examDate"
                name="examDate"
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
                disabled={loading}
                required
                aria-required="true"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="hoursPerDay"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Study hours / day
              </label>

              <input
                id="hoursPerDay"
                name="hoursPerDay"
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                value={hoursPerDay}
                onChange={(event) =>
                  setHoursPerDay(event.target.value)
                }
                disabled={loading}
                required
                aria-required="true"
                aria-describedby="hours-help"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <p
                id="hours-help"
                className="mt-2 text-xs text-slate-500"
              >
                Enter a value between 0.5 and 12 hours.
              </p>
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Generating your plan..."
                  : "Generate Study Plan"}
              </button>
            </div>
          </form>
        </section>

        {/* Error */}
        {error && !loading && (
          <section
            role="alert"
            aria-live="assertive"
            className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-red-400">
                  Something went wrong
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {error}
                </p>
              </div>

              <div className="flex gap-3">
                {lastRequest && (
                  <button
                    type="button"
                    onClick={retryGeneration}
                    className="rounded-lg bg-red-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-red-300 focus:outline-none focus:ring-4 focus:ring-red-400/30"
                  >
                    Try Again
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setError("")}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-500/30"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Loading */}
        {loading && (
          <section
            aria-live="polite"
            aria-busy="true"
            className="mt-8 space-y-6"
          >
            <p className="sr-only">
              Your study plan is being generated. Please wait.
            </p>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
              <div className="mt-4 h-8 w-2/3 animate-pulse rounded bg-slate-800" />
              <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-800" />
              <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-slate-800" />
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="h-6 w-24 animate-pulse rounded bg-slate-800" />
              <div className="mt-4 h-8 w-1/2 animate-pulse rounded bg-slate-800" />

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-3/5 animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
                </div>

                <div className="space-y-3">
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-4/6 animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Empty */}
        {!plan && !loading && !error && (
          <section
            aria-labelledby="empty-state-title"
            className="mt-8 rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-2xl">
              📚
            </div>

            <h2
              id="empty-state-title"
              className="mt-5 text-2xl font-bold"
            >
              Your study plan will appear here
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Enter your study details above and generate a
              personalized plan with topics, tasks, revision
              strategies, and estimated study time.
            </p>
          </section>
        )}

        {/* Study Plan */}
        {plan && !loading && (
          <section
            aria-labelledby="plan-title"
            className="mt-10"
          >
            {/* Plan Header */}
            <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                    Your personalized plan
                  </p>

                  <h2
                    id="plan-title"
                    className="mt-2 text-3xl font-bold"
                  >
                    {plan.title}
                  </h2>

                  <p className="mt-3 max-w-3xl leading-7 text-slate-400">
                    {plan.summary}
                  </p>
                </div>

                <div
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 text-center"
                  aria-label={`Study progress: ${progress}% completed`}
                >
                  <div className="text-3xl font-bold text-cyan-400">
                    {progress}%
                  </div>

                  <div className="text-xs text-slate-500">
                    completed
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs text-slate-400">
                  <span id="progress-label">
                    {completedCount} of {totalTasks} tasks completed
                  </span>

                  <span aria-hidden="true">{progress}%</span>
                </div>

                <div
                  className="h-3 overflow-hidden rounded-full bg-slate-800"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-labelledby="progress-label"
                >
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-950 p-4">
                  <p className="text-sm text-slate-500">
                    Study days
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {plan.totalDays}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950 p-4">
                  <p className="text-sm text-slate-500">
                    Hours / day
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {plan.dailyHours}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950 p-4">
                  <p className="text-sm text-slate-500">
                    Tasks
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {totalTasks}
                  </p>
                </div>
              </div>
            </div>

            {/* Days */}
            <div className="space-y-6">
              {plan.days.map((day) => (
                <article
                  key={day.day}
                  aria-labelledby={`day-${day.day}-title`}
                  className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-cyan-400">
                        Day {day.day}
                      </p>

                      <h3
                        id={`day-${day.day}-title`}
                        className="mt-1 text-2xl font-bold"
                      >
                        {day.title}
                      </h3>
                    </div>

                    <span
                      aria-label={`${day.estimatedHours} study hours`}
                      className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300"
                    >
                      {day.estimatedHours}h
                    </span>
                  </div>

                  <div className="grid gap-8 md:grid-cols-2">
                    {/* Topics */}
                    <div>
                      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                        Topics
                      </h4>

                      <ul className="space-y-2">
                        {day.topics.map((topic, index) => (
                          <li
                            key={`${topic}-${index}`}
                            className="text-slate-300"
                          >
                            <span
                              aria-hidden="true"
                              className="mr-2 text-cyan-400"
                            >
                              •
                            </span>
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Tasks */}
                    <div>
                      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                        Tasks
                      </h4>

                      <ul className="space-y-3">
                        {day.tasks.map((task, taskIndex) => {
                          const taskId = `${day.day}-${taskIndex}`;
                          const completed =
                            completedTasks[taskId] ?? false;

                          return (
                            <li
                              key={taskId}
                              className="flex items-start gap-3"
                            >
                              <input
                                id={taskId}
                                type="checkbox"
                                checked={completed}
                                onChange={() =>
                                  toggleTask(taskId)
                                }
                                aria-label={`Mark task complete: ${task}`}
                                className="mt-1 h-4 w-4 cursor-pointer accent-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                              />

                              <label
                                htmlFor={taskId}
                                className={`cursor-pointer leading-6 transition ${
                                  completed
                                    ? "text-slate-500 line-through"
                                    : "text-slate-300"
                                }`}
                              >
                                {task}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Revision Strategy */}
            {plan.revisionStrategy?.length > 0 && (
              <section
                aria-labelledby="revision-title"
                className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6"
              >
                <h3
                  id="revision-title"
                  className="text-2xl font-bold"
                >
                  Revision Strategy
                </h3>

                <ul className="mt-4 space-y-3">
                  {plan.revisionStrategy.map((strategy, index) => (
                    <li
                      key={`${strategy}-${index}`}
                      className="text-slate-300"
                    >
                      <span
                        aria-hidden="true"
                        className="mr-2 text-cyan-400"
                      >
                        •
                      </span>
                      {strategy}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>
        )}
      </div>
    </main>
  );
}