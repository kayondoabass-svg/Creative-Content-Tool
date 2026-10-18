# Security policy

For suspected vulnerabilities, use https://www.brightboardapp.com/contact and
request a private security-reporting channel. Do not publish active bearer keys,
customer documents or a working exploit against a live classroom.

## Deployment checklist

- Use HTTPS, current Node/browser versions and a restrictive network firewall.
- Serve web files from `dist/` only; run `build/server.cjs` separately.
- Preserve same-origin API routing and Authorization headers.
- Never log presentation payloads, pairing bearer keys or Authorization headers.
- Rate limits are in-memory and require review before larger/multi-process use.
- Configure the proxy timeout above 25 seconds for long polling.
- Review dependency advisories and update tested releases.
- Never bypass host approval for controllers or send speaker notes to displays.
- Do not expose a local school server to the internet without administrator review.

The relay intentionally stores rooms only in memory. Restarting the server ends
them. This is not a high-availability or regulated-data storage service. Do not
place credentials, health records or confidential personnel information in demo
presentations. Hosts should end sharing before leaving a device.
