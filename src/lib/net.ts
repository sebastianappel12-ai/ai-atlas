/**
 * Make Node's fetch go through HTTP(S)_PROXY when one is set (cloud sandboxes route all
 * traffic through a proxy; Node's built-in fetch ignores those variables by default).
 * Trusts the sandbox's CA bundle when one is provided. No effect on a normal machine.
 */
import fs from "node:fs";
import tls from "node:tls";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

let done = false;
export function useEnvProxy() {
  if (done || typeof window !== "undefined") return;
  done = true;
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  if (!proxy) return;
  const bundle = [process.env.NODE_EXTRA_CA_CERTS, process.env.SSL_CERT_FILE, "/root/.ccr/ca-bundle.crt"].find((f) => f && fs.existsSync(f));
  const ca = bundle ? [...tls.rootCertificates, fs.readFileSync(bundle, "utf8")] : undefined;
  setGlobalDispatcher(new EnvHttpProxyAgent(ca ? { requestTls: { ca }, proxyTls: { ca } } : {}));
}
