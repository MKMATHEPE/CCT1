import "dotenv/config";
import { createAdminUser } from "../services/authService.ts";

type AdminArgs = {
  name: string;
  insurerName: string;
  username: string;
  password: string;
};

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return "";
  }

  return process.argv[index + 1]?.trim() ?? "";
}

function parseArgs(): AdminArgs {
  return {
    name: readArg("--name"),
    insurerName: readArg("--insurer"),
    username: readArg("--username"),
    password: readArg("--password"),
  };
}

function usage() {
  console.error(
    [
      "Usage:",
      'npm run create-admin -- --name "Admin User" --insurer "Your Company" --username admin --password "StrongPass123!"',
    ].join("\n")
  );
}

async function main() {
  const args = parseArgs();

  if (!args.name || !args.insurerName || !args.username || !args.password) {
    usage();
    process.exit(1);
  }

  const user = await createAdminUser(args);
  console.log(
    JSON.stringify(
      {
        success: true,
        user,
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Failed to create admin user.";
  console.error(message);
  process.exit(1);
});
