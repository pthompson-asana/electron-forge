import * as fs from 'fs-extra';
import * as path from 'path';

const BASE_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.resolve(BASE_DIR, 'packages');

async function copyTSConfig(packageDir: string): Promise<void> {
  const relativeBaseDir = path.relative(packageDir, BASE_DIR);
  const tsconfig = await fs.readJson(path.resolve(BASE_DIR, 'tsconfig.json'));
  tsconfig.compilerOptions.typeRoots = [path.join(relativeBaseDir, 'node_modules', '@types'), path.join(relativeBaseDir, 'typings')];
  await fs.writeJson(path.resolve(packageDir, 'tsconfig.json'), tsconfig, { spaces: 2 });
}

(async () => {
  const dirsToLink = [];

  for (const subDir of await fs.readdir(PACKAGES_DIR)) {
    for (const packageDir of await fs.readdir(path.resolve(PACKAGES_DIR, subDir))) {
      dirsToLink.push(path.resolve(PACKAGES_DIR, subDir, packageDir));
    }
  }

  for (const dir of dirsToLink) {
    await copyTSConfig(dir);
    await fs.copy(path.resolve(BASE_DIR, '.npmignore'), path.resolve(dir, '.npmignore'));
    const pj = await fs.readJson(path.resolve(dir, 'package.json'));
    if (pj.main) {
      const mainFile = pj.main.replace('dist', 'src').replace('.js', '.ts');
      const importableFile = mainFile.replace('.ts', '');
      const hasDefault = (await fs.readFile(path.resolve(dir, mainFile), 'utf8')).includes('export default');

      if (hasDefault) {
        await fs.writeFile(path.resolve(dir, 'index.ts'), `import d from './${importableFile}';\nexport default d;\nexport * from './${importableFile}';\n`);
      } else {
        await fs.writeFile(path.resolve(dir, 'index.ts'), `export * from './${importableFile}';\n`);
      }
    }
  }
})();
