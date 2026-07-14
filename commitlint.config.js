/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "docs",
        "revert",
      ],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "client",
        "pack",
        "web",
        "server",
        "engine",
        "ci",
        "docs",
        "workspace",
        "release",
      ],
    ],
    "scope-empty": [0],
    "subject-case": [0],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 100],
  },
};
