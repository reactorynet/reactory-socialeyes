import { readFileSync } from 'fs';
import { join } from 'path';

const SocialEyesSchema = readFileSync(join(__dirname, 'SocialEyes.graphql'), 'utf8');

export default [
  SocialEyesSchema
];
