import { createServer } from "node:net";

export async function findAvailablePort(startPort: number, attempts = 20): Promise<number> {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset;
    const isAvailable = await canListen(port);
    if (isAvailable) {
      return port;
    }
  }

  throw new Error(`No available port found starting at ${startPort}`);
}

function canListen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer();

    tester.once("error", () => {
      resolve(false);
    });

    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, "127.0.0.1");
  });
}
