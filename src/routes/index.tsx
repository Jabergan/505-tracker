import { createFileRoute } from "@tanstack/react-router";
import { JobApp } from "@/components/tracker/job-app";
import { loadJob } from "@/lib/tracker/functions";

export const Route = createFileRoute("/")({
  loader: () => loadJob(),
  component: Home,
  pendingComponent: Pending,
});

function Home() {
  const data = Route.useLoaderData();
  return <JobApp initial={data} />;
}

function Pending() {
  return (
    <div className="min-h-dvh bg-bg px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="h-12 w-28 rounded-md bg-sunken" />
        <div className="mt-2 h-3 w-40 rounded-md bg-sunken" />
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-sunken" />
          ))}
        </div>
      </div>
    </div>
  );
}
