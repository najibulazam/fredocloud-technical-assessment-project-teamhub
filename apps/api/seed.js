import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { prisma } from "@team-hub/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiEnvPath = path.join(__dirname, ".env");

if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
} else {
  dotenv.config();
}

const DEMO_EMAIL = "teamhub@gmail.com";
const DEMO_PASSWORD = "Demo1234";
const DEMO_NAME = "Team Hub Demo";
const DEMO_WORKSPACE = "Team Hub Demo Workspace";

async function main() {
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: DEMO_NAME,
      password: hashedPassword
    },
    create: {
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      password: hashedPassword
    }
  });

  let workspace = await prisma.workspace.findFirst({
    where: { name: DEMO_WORKSPACE }
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: DEMO_WORKSPACE,
        description: "Demo workspace for Team Hub",
        accentColor: "#6366f1"
      }
    });
  }

  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id
      }
    },
    update: {
      role: "ADMIN"
    },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: "ADMIN"
    }
  });

  console.log("Demo user ready:");
  console.log(`Email: ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
