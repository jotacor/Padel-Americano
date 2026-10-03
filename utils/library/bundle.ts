// Several tournaments in/out at once: .yaml files and .zip archives of .yaml files. fflate is lazy-loaded.
import type { Tournament } from '../../types.ts';

export interface ImportFile { name: string; text: string }
export interface ImportFileError { name: string; detail: string }

const MAX_ENTRY_BYTES = 5 * 1024 * 1024;
const MAX_ENTRIES = 500;
const isYaml = (name: string) => /\.ya?ml$/i.test(name);

/** Text of every .yaml/.yml given directly or inside .zip files (other entries ignored; oversized ones rejected) */
export const readImportFiles = async (files: File[]): Promise<{ files: ImportFile[]; errors: ImportFileError[] }> => {
  const out: ImportFile[] = [];
  const errors: ImportFileError[] = [];
  for (const file of files) {
    try {
      if (/\.zip$/i.test(file.name)) {
        const { unzipSync, strFromU8 } = await import('fflate');
        const tooBig: string[] = [];
        const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
          filter: f => {
            if (!isYaml(f.name) || f.name.split('/').pop()?.startsWith('.')) return false;
            if (f.originalSize > MAX_ENTRY_BYTES) { tooBig.push(f.name); return false; }
            return true;
          },
        });
        tooBig.forEach(name => errors.push({ name: `${file.name}/${name}`, detail: 'tooLarge' }));
        Object.entries(entries).slice(0, MAX_ENTRIES).forEach(([name, data]) => out.push({ name: `${file.name}/${name}`, text: strFromU8(data) }));
      } else if (isYaml(file.name)) {
        out.push({ name: file.name, text: await file.text() });
      }
    } catch (e) {
      errors.push({ name: file.name, detail: e instanceof Error ? e.message : String(e) });
    }
  }
  return { files: out, errors };
};

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'torneo';

/** Zip with one YAML per tournament (`<name>-<id8>.yaml`) */
export const zipTournaments = async (tournaments: Tournament[], serialize: (t: Tournament) => string): Promise<Blob> => {
  const { zipSync, strToU8 } = await import('fflate');
  const files: Record<string, Uint8Array> = {};
  tournaments.forEach(t => { files[`${slug(t.name)}-${t.id.slice(0, 8)}.yaml`] = strToU8(serialize(t)); });
  return new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' });
};
