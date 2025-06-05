import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEMOS_DIR = path.join(__dirname, '../../server/demos');
const PLACEHOLDER = '__SCORELYTIC_CLIENT_URL__';
const CLIENT_URL =
  process.env.LOCAL_CLIENT === '1'
    ? 'http://localhost:4000/dashboard'
    : 'https://www.scorelytic.com/dashboard';

const walk = (dir: string, ext: string, fileList: string[] = []) => {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, ext, fileList);
    } else if (filePath.endsWith(ext)) {
      fileList.push(filePath);
    }
  });
  return fileList;
};

const htmlFiles = walk(DEMOS_DIR, '.html');

htmlFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(PLACEHOLDER)) {
    const updated = content.replace(new RegExp(PLACEHOLDER, 'g'), CLIENT_URL);
    fs.writeFileSync(file, updated, 'utf8');
    console.log(`Patched: ${file}`);
  }
});
