const fs = require('fs');
const path = require('path');
const { runDryRun } = require('../dist/src/functions/blogWorker.js');

const mockContext = {
  log: (...args) => console.log('[LOG]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERR]', ...args),
  info: (...args) => console.info('[INFO]', ...args),
};

async function main() {
  const topics = [
    'Focalyst vs Notability for students',
    'How to stop doomscrolling at night',
  ];

  const results = {};

  for (const topic of topics) {
    console.log('\n=============================================================');
    console.log(`STARTING DRY RUN: "${topic}"`);
    console.log('=============================================================\n');

    const start = Date.now();
    try {
      const res = await runDryRun(topic, mockContext);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`\nCOMPLETED "${topic}" in ${elapsed}s`);
      console.log('Result status:', res.status);
      console.log('Post ID:', res.postId);
      console.log('Slug:', res.slug);
      console.log('Lint pass:', res.lint?.pass);
      console.log('Lint violations:', JSON.stringify(res.lint?.violations || [], null, 2));
      console.log('Critic verdict:', res.critic?.verdict);
      console.log('Word count:', res.lint?.wordCount);
      
      const words = (res.draft || '').split(/\s+/);
      const first300 = words.slice(0, 300).join(' ');
      console.log('\n--- FIRST 300 WORDS ---');
      console.log(first300);
      console.log('--- END FIRST 300 WORDS ---\n');

      results[topic] = {
        status: res.status,
        postId: res.postId,
        slug: res.slug,
        lintPass: res.lint?.pass,
        violations: res.lint?.violations || [],
        criticVerdict: res.critic?.verdict,
        wordCount: res.lint?.wordCount,
        first300Words: first300,
      };
    } catch (err) {
      console.error(`ERROR running dry run for "${topic}":`, err);
      process.exit(1);
    }
  }

  const outputPath = path.join(__dirname, 'dry-run-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`All dry runs finished successfully. Output written to ${outputPath}`);
  process.exit(0);
}

main();
