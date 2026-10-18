# Uploading this source to GitHub manually

Use **BrightboardTV-source-v1.0.0.zip** for:
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
