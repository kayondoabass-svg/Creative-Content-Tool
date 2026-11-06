import { createHmac, createPrivateKey, createPublicKey, sign, randomUUID } from "node:crypto";

// Purpose-separated signing key. Only the public key is deployed to Cloudflare.
// The session secret and Cloudflare setup token never leave the VPS.
function key(secret = process.env.SESSION_SECRET) {
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET is required for private sharing storage.");
  const seed = createHmac("sha256", secret).update("brightboard-sharing-worker-signing-key:v1").digest();
  return createPrivateKey({ key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]), format: "der", type: "pkcs8" });
}
export function sharingPublicKey(secret?: string) {
  return createPublicKey(key(secret)).export({ type: "spki", format: "der" }).toString("base64");
}
export function sharingSignature(body: string, secret?: string) {
  const timestamp = String(Date.now()), nonce = randomUUID();
  return {
    "content-type": "application/json",
    "x-bb-time": timestamp, "x-bb-nonce": nonce,
    "x-bb-signature": sign(null, Buffer.from(`POST\n/rpc\n${timestamp}\n${nonce}\n${body}`), key(secret)).toString("base64"),
  };
}
