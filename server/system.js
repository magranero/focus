import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';

const run = promisify(exec);

/** Disk usage of the main volume: { totalGb, freeGb, usedPct } */
export async function getDiskInfo() {
  if (process.platform === 'win32') {
    const { stdout } = await run(
      'powershell -NoProfile -Command "Get-PSDrive C | Select-Object Used,Free | ConvertTo-Json"'
    );
    const { Used, Free } = JSON.parse(stdout);
    const total = Used + Free;
    return {
      totalGb: +(total / 1e9).toFixed(1),
      freeGb: +(Free / 1e9).toFixed(1),
      usedPct: Math.round((Used / total) * 100)
    };
  }
  const { stdout } = await run(`df -k ${os.homedir()}`);
  const line = stdout.trim().split('\n').pop().split(/\s+/);
  const totalKb = Number(line[1]);
  const freeKb = Number(line[3]);
  return {
    totalGb: +((totalKb * 1024) / 1e9).toFixed(1),
    freeGb: +((freeKb * 1024) / 1e9).toFixed(1),
    usedPct: Math.round(((totalKb - freeKb) / totalKb) * 100)
  };
}
