import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  try {
    const email = "admin@yourbrand.com";
    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user) throw new Error("Target admin not found");
    const password = randomBytes(32).toString("base64url");
    const passwordHash = await bcrypt.hash(password, 12);
    // Save recovery before changing the database; never overwrite or print secrets.
    // .env* is excluded from Git. Move this credential to your password manager.
    const recoveryPath = resolve(".env.admin-recovery");
    writeFileSync(recoveryPath, `ADMIN_EMAIL=${email}\nADMIN_PASSWORD=${password}\n`, { flag: "wx", mode: 0o600 });
    const result = await prisma.adminUser.updateMany({
      where: { id: user.id, passwordHash: user.passwordHash },
      data: { passwordHash },
    });
    if (result.count !== 1) throw new Error("Concurrent credential change; rotation not applied");
    const current = await prisma.adminUser.findUniqueOrThrow({ where: { id: user.id } });
    const newWorks = await bcrypt.compare(password, current.passwordHash);
    const defaultWorks = await bcrypt.compare("admin123", current.passwordHash);
    if (!newWorks || defaultWorks) throw new Error("Credential verification failed");
    console.log("ROTATION_VERIFIED: new password accepted; default password rejected. Recovery: .env.admin-recovery");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error("Rotation failed. Inspect the database and local recovery file before retrying; credentials were not printed.");
  process.exitCode = 1;
});
