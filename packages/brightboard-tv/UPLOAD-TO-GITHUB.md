# Manual source upload and GitHub Release

Use **BrightboardTV-source-v1.0.1.zip** for:
https://github.com/kayondoabass-svg/Brightboard-TV

1. Download and extract the source ZIP.
2. Open the extracted `Brightboard-TV` folder.
3. In GitHub, open your repository and choose **Add file → Upload files**
   (an empty repository also offers **uploading an existing file**).
4. Upload the **contents inside** `Brightboard-TV`: `src`, `server`, `scripts`,
   `public`, configuration files, `package.json`, `package-lock.json` and docs.
   Do not upload the outer folder as another nested directory.
5. Include `.github/workflows/check.yml` if you want automated build/test checks.
   Your computer may hide dot-folders; enable “show hidden files” to select it.
6. Commit the uploaded files to the repository's default branch.
7. Check that `package.json` and `README.md` are visible at the repository root.

Do not just upload the ZIP itself as the repository's only source file: extract
it first. The compiled **ready-to-run ZIP** is for server installation; it can
optionally be attached to a GitHub Release, not used instead of the source.

Neither ZIP contains BrightBoard's private account/payment/dashboard source,
customer information, API keys, installed `node_modules`, or private Git history.

## Publish a counted release

Uploading repository files above does **not** create a counted download.
Once the clean source is committed:

1. Open https://github.com/kayondoabass-svg/Brightboard-TV/releases/new.
2. Choose **Choose a tag**, enter **v1.0.1**, and choose to create that tag on
   the commit containing the independent source. Never target the private
   BrightBoard website repository or import its history.
3. Set the title to **BrightboardTV v1.0.1**.
4. Paste the supplied `RELEASE-NOTES.md` into the description.
5. Under **Attach binaries**, upload these three files from the same prepared
   bundle:
   - `BrightboardTV-source-v1.0.1.zip`
   - `BrightboardTV-prebuilt-v1.0.1.zip`
   - `SHA256SUMS.txt`
6. Leave **pre-release** unchecked and click **Publish release**, not just
   **Save draft**. Wait for all uploads to finish before publishing.
7. Open the published release while signed out and confirm both named ZIP
   assets and the checksum file are downloadable.

GitHub adds its own **Source code (zip)** and **Source code (tar.gz)** links.
These are not the prepared ZIPs, and GitHub does not expose download counts for
them. Clones, installs, notes and checksum downloads are not included in the
founder's software-download counter either.

### Verify the files

Download both ZIPs and `SHA256SUMS.txt` into one folder. On Linux run
`sha256sum -c SHA256SUMS.txt`; on macOS run `shasum -a 256 -c SHA256SUMS.txt`.
On Windows use `Get-FileHash .\BrightboardTV-source-v1.0.1.zip -Algorithm SHA256`
and repeat for the prebuilt file, comparing both values with `SHA256SUMS.txt`.

After publication, BrightBoard maintainers can run the read-only check from
their **private workspace**, not the public source repository:

```sh
npm run tv:release:verify -- v1.0.1
```

It downloads the actual public assets, compares them with the prepared
checksums, and runs the same GitHub reader used by the founder counter. Its two
ZIP downloads are real downloads and may increment GitHub's counters. GitHub
updates counts asynchronously; the website caches successful totals for up to
15 minutes. Open **Founder dashboard → BrightboardTV software downloads** to
see the release asset totals separately from hosted website downloads.

### Preparing a later release

In the private maintainer workspace, update the independent package version
and lockfile together, update `CHANGELOG.md`, `RELEASE-NOTES.md` and this guide,
then run `npm run tv:release:prepare`. It builds only the independent core and
writes versioned ZIPs, notes and checksums under
`generated-artifacts/brightboardtv/v<version>/`. That directory is excluded
from Git and deployment. It does not push, tag or publish anything.

Do not regenerate a bundle after publishing it under the same tag: preserve
the published checksums and use a new version for changed files.
