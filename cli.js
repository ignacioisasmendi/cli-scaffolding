#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { execa } from 'execa';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateDir = path.join(__dirname, 'templates');

const argv = yargs(hideBin(process.argv))
  .option('projectName', { type: 'string', demandOption: true })
  .option('swagger', { type: 'boolean', default: false })
  .option('logger', { type: 'boolean', default: false })
  .option('typeorm', { type: 'boolean', default: false })
  .argv;

const { projectName, swagger, logger, typeorm } = argv;

console.log(chalk.green(`\n🚀 Creando proyecto NestJS "${projectName}"...\n`));
await execa('npx', ['@nestjs/cli', 'new', projectName, '--package-manager', 'npm'], { stdio: 'inherit' });

process.chdir(projectName);
copyBaseFiles();

const dependencies = [];
if (swagger) dependencies.push('@nestjs/swagger', 'swagger-ui-express');
if (logger) dependencies.push('nestjs-pino', 'pino-pretty');
if (typeorm) dependencies.push('@nestjs/typeorm', 'typeorm', 'sqlite3');

if (dependencies.length > 0) {
  console.log(chalk.yellow('\n📦 Instalando dependencias adicionales...\n'));
  await execa('npm', ['install', ...dependencies], { stdio: 'inherit' });
}

if (logger) copyTemplate('logger');
if (swagger) copyTemplate('swagger');

console.log(chalk.green(`\n✅ Proyecto ${projectName} generado exitosamente.`));

function copyTemplate(folder) {
  const src = path.join(templateDir, folder);
  const dest = process.cwd();
  fs.readdirSync(src).forEach(file => {
    fs.copyFileSync(path.join(src, file), path.join(dest, 'src', file));
  });
}

function copyBaseFiles() {
  const src = path.join(templateDir, 'base');
  const dest = path.join(process.cwd(), 'src');
  fs.readdirSync(src).forEach(file => {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  });
}
