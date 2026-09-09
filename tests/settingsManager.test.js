import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  initSettingsManager,
  getSettings,
  saveSettings,
  getForms,
  saveForms
} from '../electron/services/settingsManager.js';

describe('settingsManager', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pogo-test-settings-'));
    initSettingsManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns default settings on fresh init', () => {
    const settings = getSettings();
    expect(settings.lastActiveLeague).toBe('1500');
    expect(settings.lastView).toBe('my-pokemon');
    expect(settings.cacheRefreshIntervalHours).toBe(24);
  });

  it('updates and persists settings', () => {
    saveSettings({ lastActiveLeague: '2500', lastView: 'meta' });
    const updated = getSettings();
    expect(updated.lastActiveLeague).toBe('2500');
    expect(updated.lastView).toBe('meta');

    // Verify written to disk
    const onDisk = JSON.parse(fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf-8'));
    expect(onDisk.lastActiveLeague).toBe('2500');
  });

  it('seeds and returns default forms if userData/forms.json does not exist', () => {
    const forms = getForms();
    expect(forms.Galar).toBe('galarian');
    expect(forms.Alola).toBe('alolan');
  });

  it('saves new custom form mapping and merges it', () => {
    saveForms({ 'CélesteTest': 'sky_test' });
    const forms = getForms();
    expect(forms.CélesteTest).toBe('sky_test');
    expect(forms.Galar).toBe('galarian');
  });
});
