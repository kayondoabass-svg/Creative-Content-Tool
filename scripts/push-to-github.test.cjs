// Isolated repositories only: no GitHub network access or real secrets.
// Run: node --test scripts/push-to-github.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const script = path.join(__dirname, 'push-to-github.sh');
const remote = 'https://github.com/kayondoabass-svg/Creative-Content-Tool.git';
const dummy = 'synthetic-test-credential-not-a-real-token';
const realGit = spawnSync('which', ['git'], { encoding: 'utf8' }).stdout.trim();

function fixture(t, mode = '') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brightboard-push-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, 'repo');
  const bare = path.join(root, 'remote.git');
  const bin = path.join(root, 'bin');
  fs.mkdirSync(repo);
  fs.mkdirSync(bin);
  const env = {
    ...process.env,
    HOME: root,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: path.join(root, 'gitconfig'),
    GITHUB_PAT: dummy,
    PATH: `${bin}:${process.env.PATH}`,
    TEST_ROOT: root,
    TEST_GIT: realGit,
    TEST_BARE: bare,
    TEST_MODE: mode,
  };
  // Do not inherit Git command/config injection from the developer's shell.
  for (const key of Object.keys(env)) {
    if (/^GIT_(CONFIG_(COUNT|KEY_|VALUE_|PARAMETERS)|DIR$|WORK_TREE$|INDEX_FILE$)/.test(key)) {
      delete env[key];
    }
  }
  function git(...args) {
    const result = spawnSync(realGit, args, { cwd: repo, env, encoding: 'utf8' });
    assert.equal(result.status, 0, 'fixture Git command failed');
    return result.stdout.trim();
  }
  git('init', '-b', 'main');
  git('init', '--bare', bare);
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.invalid');
  fs.writeFileSync(path.join(repo, 'source.txt'), 'initial\n');
  git('add', '.');
  git('commit', '-m', 'Initial');
  git('remote', 'add', 'origin', `https://old:${dummy}@github.com/old/repo.git`);
  git('config', '--add', 'remote.origin.url', 'https://github.com/extra/repo.git');
  git('config', 'remote.origin.pushurl', `https://old:${dummy}@github.com/old/push.git`);
  // Must not be invoked, even on Git's credential approve/store operation.
  git('config', 'credential.helper', `!touch '${root}/unexpected-helper'`);
  if (mode === 'inherited-rewrite') {
    git('config', '--global', `url.https://old:${dummy}@github.com/.insteadOf`, 'https://github.com/');
    git('config', '--global', `url.https://old:${dummy}@github.com/.pushInsteadOf`, 'https://github.com/');
  }
  fs.writeFileSync(path.join(bin, 'npm'), `#!/bin/sh
test "$1 $2" = "run build" || exit 90
echo build >> "$TEST_ROOT/order"
[ "$TEST_MODE" != build-failure ] || exit 23
mkdir -p dist
echo built > dist/build.txt
`);
  fs.writeFileSync(path.join(bin, 'git'), `#!${process.execPath}
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const args = process.argv.slice(2);
if (!args.includes('push')) {
  const r = spawnSync(process.env.TEST_GIT, args, {stdio:'inherit'});
  process.exit(r.status ?? 1);
}
const check = (ok) => { if (!ok) process.exit(91); };
check(!args.some(arg => arg.includes(process.env.GITHUB_PAT)));
check(!process.env.GIT_TRACE && !process.env.GIT_TRACE_CURL && !process.env.GIT_CURL_VERBOSE);
check(args.includes('credential.helper='));
const helper = args.find(arg => arg.startsWith('credential.helper=') && arg !== 'credential.helper=').slice('credential.helper='.length);
const configArgs = args.slice(0, args.indexOf('push'));
for (const flags of [[], ['--push']]) {
  const url = spawnSync(process.env.TEST_GIT, [...configArgs, 'remote', 'get-url', ...flags, '--all', 'origin'], {encoding:'utf8'});
  check(url.status === 0 && url.stdout.trim() === 'https://github.com/kayondoabass-svg/Creative-Content-Tool.git');
}
fs.writeFileSync(process.env.TEST_ROOT + '/helper-path', helper);
check((fs.statSync(helper).mode & 0o777) === 0o700);
check((fs.statSync(require('node:path').dirname(helper)).mode & 0o777) === 0o700);
check(!fs.readFileSync(helper, 'utf8').includes(process.env.GITHUB_PAT));
// Exercise Git's actual credential protocol; never emit its captured stdout.
const filled = spawnSync(process.env.TEST_GIT, [...configArgs, 'credential', 'fill'], {
  input:'protocol=https\\nhost=github.com\\n\\n', encoding:'utf8'
});
check(filled.status === 0);
check(filled.stdout.includes('password=' + process.env.GITHUB_PAT + '\\n'));
for (const input of ['protocol=http\\nhost=github.com\\n\\n', 'protocol=https\\nhost=example.com\\n\\n']) {
  const denied = spawnSync(helper, ['get'], {input, encoding:'utf8'});
  check(denied.status === 0 && denied.stdout === '');
}
const stored = spawnSync(process.env.TEST_GIT, [...configArgs, 'credential', 'approve'], {
  input:filled.stdout, encoding:'utf8'
});
check(stored.status === 0);
check(!fs.existsSync(process.env.TEST_ROOT + '/unexpected-helper'));
check(!fs.existsSync(process.env.HOME + '/.git-credentials'));
fs.appendFileSync(process.env.TEST_ROOT + '/order', 'push\\n');
if (process.env.TEST_MODE === 'push-failure') process.exit(24);
// Push the built commit to a real local bare repository, never to GitHub.
const pushed = spawnSync(process.env.TEST_GIT, ['push', process.env.TEST_BARE, 'main'], {stdio:'inherit'});
if (process.env.TEST_MODE === 'remote-tamper') {
  spawnSync(process.env.TEST_GIT, ['config','remote.origin.pushurl','https://github.com/wrong/repo.git']);
}
process.exit(pushed.status ?? 1);
`);
  fs.chmodSync(path.join(bin, 'npm'), 0o700);
  fs.chmodSync(path.join(bin, 'git'), 0o700);
  function run(extra = {}) {
    const result = spawnSync('bash', ['-x', script, 'Test deployment'], {
      cwd: repo, env: { ...env, GIT_TRACE: '1', GIT_TRACE_CURL: '1', GIT_CURL_VERBOSE: '1', ...extra },
      encoding: 'utf8',
    });
    assert.ok(!`${result.stdout}${result.stderr}`.includes(dummy), 'credential leaked in output');
    const helperRecord = path.join(root, 'helper-path');
    if (fs.existsSync(helperRecord)) {
      assert.ok(!fs.existsSync(path.dirname(fs.readFileSync(helperRecord, 'utf8'))), 'helper not cleaned up');
    }
    return result;
  }
  return { root, repo, bare, git, run };
}

test('builds and commits dist before a push, without saved credentials', (t) => {
  const f = fixture(t);
  assert.equal(f.run().status, 0);
  assert.equal(fs.readFileSync(path.join(f.root, 'order'), 'utf8'), 'build\npush\n');
  assert.equal(f.git('remote', 'get-url', '--all', 'origin'), remote);
  assert.equal(f.git('remote', 'get-url', '--push', '--all', 'origin'), remote);
  assert.ok(!fs.readFileSync(path.join(f.repo, '.git/config'), 'utf8').includes(dummy));
  assert.equal(f.git('--git-dir', f.bare, 'show', 'main:dist/build.txt'), 'built');
  assert.ok(!f.git('log', '-p', '--all').includes(dummy));
  // A second run covers the "Nothing new to commit" path.
  const second = f.run();
  assert.equal(second.status, 0);
  assert.ok(second.stdout.includes('Nothing new to commit.'));
});

test('failed push removes helper and keeps origin clean', (t) => {
  const f = fixture(t, 'push-failure');
  assert.equal(f.run().status, 24);
  assert.equal(f.git('remote', 'get-url', '--push', '--all', 'origin'), remote);
});

test('inherited GitHub URL rewrites cannot reinsert credentials', (t) => {
  const f = fixture(t, 'inherited-rewrite');
  assert.equal(f.run().status, 0);
  assert.equal(f.git('config', '--local', '--get-all', 'remote.origin.url'), remote);
});

test('failed build never commits or pushes', (t) => {
  const f = fixture(t, 'build-failure');
  const before = f.git('rev-parse', 'HEAD');
  assert.equal(f.run().status, 23);
  assert.equal(f.git('rev-parse', 'HEAD'), before);
  assert.equal(fs.readFileSync(path.join(f.root, 'order'), 'utf8'), 'build\n');
});

test('missing secret exits before build or push', (t) => {
  const f = fixture(t);
  assert.equal(f.run({ GITHUB_PAT: '' }).status, 1);
  assert.ok(!fs.existsSync(path.join(f.root, 'order')));
});

test('post-push verification rejects a changed push URL', (t) => {
  const f = fixture(t, 'remote-tamper');
  const result = f.run();
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('credential-free GitHub URL'));
  assert.ok(!result.stdout.includes('✅ Done.'));
});
