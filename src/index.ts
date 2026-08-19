type SampleUser = {
  name: string;
  role: "learner" | "reviewer";
};

function formatGreeting(user: SampleUser): string {
  return `Hello, ${user.name}. Current role: ${user.role}.`;
}

const user: SampleUser = {
  name: "Codex",
  role: "manager",
};

console.log(formatGreeting(user));
