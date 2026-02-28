import { mergeGraphResolver } from '@reactory/server-core/utils';
import SocialEyesResolver from './SocialEyesResolver';

export default mergeGraphResolver([
  SocialEyesResolver
]);
