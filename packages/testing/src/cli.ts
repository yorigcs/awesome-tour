#!/usr/bin/env node
/// <reference types="node" />
/**
 * awesome-tour-check: open your app in a headless browser and check every registered tour's
 * steps still find their targets. Exits 1 when one doesn't — run it in CI.
 *
 *   npx awesome-tour-check http://localhost:3000 [--tour id]… [--param name=value]… [--timeout ms] [--json]
 */
import { formatAudit } from '@awesome-tour/core';
import { chromium } from '@playwright/test';
import { checkTours } from './playwright';

function parse(argv: string[]) {
  const args = {
    url: '',
    tours: [] as string[],
    params: {} as Record<string, string>,
    timeout: 3000,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--tour') args.tours.push(argv[++i] ?? '');
    else if (a === '--param') {
      const [name, ...value] = (argv[++i] ?? '').split('=');
      if (name) args.params[name] = value.join('=');
    } else if (a === '--timeout') args.timeout = Number(argv[++i]) || args.timeout;
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.url = '';
    else if (!a.startsWith('-')) args.url = a;
  }
  return args;
}

async function main() {
  const args = parse(process.argv.slice(2));
  if (!args.url) {
    console.log(
      'Usage: awesome-tour-check <url> [--tour id]... [--param name=value]... [--timeout ms] [--json]',
    );
    process.exit(args.url === '' && process.argv.length > 2 ? 0 : 2);
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const audits = await checkTours(page, {
      url: args.url,
      timeout: args.timeout,
      params: args.params,
      ...(args.tours.length ? { tours: args.tours } : {}),
    });
    console.log(args.json ? JSON.stringify(audits, null, 2) : formatAudit(audits));
    const broken = audits.filter((a) => !a.ok).length;
    if (!args.json) {
      console.log(
        broken
          ? `\n${broken} of ${audits.length} tours have missing targets.`
          : `\nAll ${audits.length} tours found their targets.`,
      );
    }
    process.exitCode = broken ? 1 : 0;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
