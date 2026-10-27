// The build produces source maps, and the public site must not serve them: a
// map is the whole source, including anything the browser never needs. This
// moves every `*.map` out of `dist` into `sourcemaps/<version>/`, where
// `yarn symbolicate` finds them again for the report that names that version.
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from 'fs';
import { dirname, join, join as pathJoin, sep } from 'path';

const walk = (dir, into = []) => {
    if (!existsSync(dir)) {
        return into;
    }
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
            walk(path, into);
        } else if (entry.endsWith('.map')) {
            into.push(path);
        }
    }
    return into;
};

const version = execSync('git describe --tags --always --dirty')
    .toString('utf8')
    .replace(/^\s+|\s+$/g, '')
    .replace(/[\\/]/g, '_');

const maps = walk('dist');
if (!maps.length) {
    console.log('No source maps in dist - is build.sourcemap enabled?');
    process.exit(0);
}

const target = pathJoin('sourcemaps', version);
for (const file of maps) {
    const destination = join(target, file.split(sep).slice(1).join(sep));
    mkdirSync(dirname(destination), { recursive: true });
    renameSync(file, destination);
}
console.log(`Moved ${maps.length} source map(s) to ${target}`);
