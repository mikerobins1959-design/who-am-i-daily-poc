import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULTS = { host: "127.0.0.1", port: 8000 };
const PUBLIC_FILES = new Set(["/index.html", "/manifest.webmanifest", "/service-worker.js"]);
const PUBLIC_DIRECTORIES = ["/assets/", "/css/", "/data/", "/js/", "/tools/preview/"];
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function parsePort(value) {
  if (!/^\d+$/.test(String(value)) || Number(value) > 65_535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return Number(value);
}

export function parseDevServerOptions(argv = [], env = process.env) {
  const options = {
    host: env.HOST || DEFAULTS.host,
    port: parsePort(env.PORT || DEFAULTS.port),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const [flag, inlineValue] = argv[index].split("=", 2);
    if (flag !== "--host" && flag !== "--port") throw new Error(`Unknown option: ${argv[index]}`);
    const value = inlineValue ?? argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    if (flag === "--host") options.host = value;
    else options.port = parsePort(value);
  }
  if (!options.host) throw new Error("Host must not be empty.");
  return options;
}

export function resolvePublicPath(requestTarget, rootDir) {
  const rawPath = requestTarget.split(/[?#]/, 1)[0];
  let pathname;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (pathname.includes("\\") || pathname.includes("\0")) return null;
  if (pathname.split("/").some((part) => part === ".." || part.startsWith("."))) return null;
  if (pathname === "/") pathname = "/index.html";
  if (pathname.endsWith("/")) pathname += "index.html";
  const isPublic = PUBLIC_FILES.has(pathname) || PUBLIC_DIRECTORIES.some((dir) => pathname.startsWith(dir));
  if (!isPublic) return null;

  const root = resolve(rootDir);
  const filePath = resolve(root, `.${pathname}`);
  const fromRoot = relative(root, filePath);
  return fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot) ? null : filePath;
}

function sendText(response, status, body) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}

export function createDevServer({ rootDir = fileURLToPath(new URL("../", import.meta.url)) } = {}) {
  return createServer(async (request, response) => {
    if (!new Set(["GET", "HEAD"]).has(request.method)) {
      response.setHeader("Allow", "GET, HEAD");
      sendText(response, 405, "Method not allowed.\n");
      return;
    }
    const filePath = resolvePublicPath(request.url || "/", rootDir);
    if (!filePath) return sendText(response, 404, "Not found.\n");
    try {
      const file = await stat(filePath);
      if (!file.isFile()) return sendText(response, 404, "Not found.\n");
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Length": file.size,
        "Content-Type": MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });
      if (request.method === "HEAD") response.end();
      else createReadStream(filePath).on("error", () => response.destroy()).pipe(response);
    } catch {
      sendText(response, 404, "Not found.\n");
    }
  });
}

async function run() {
  const { host, port } = parseDevServerOptions(process.argv.slice(2));
  const server = createDevServer();
  await new Promise((done, reject) => server.once("error", reject).listen(port, host, done));
  const address = server.address();
  console.log(`Who Am I? Daily: http://${host}:${address.port}`);
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => server.close(() => process.exit(0)));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
