import Reactory from '@reactorynet/reactory-core';
import version from './version';
import schema from './schema';
import { GridUISchema, ListUiSchema } from './uiSchema';
import modules from './modules';
import graphql from './graphql';

const name = 'SocialFeed';
const nameSpace = 'socialeyes';

const SocialFeed: Reactory.Forms.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema: GridUISchema,
  uiSchemas: [
    {
      id: 'default',
      description: 'Grid Schema',
      icon: 'table',
      key: 'default',
      title: 'Paginated Table',
      uiSchema: GridUISchema
    },
    {
      id: 'list',
      description: 'List',
      icon: 'list',
      key: 'list',
      title: 'Infinite List',
      uiSchema: ListUiSchema
    }
  ],
  uiFramework: 'material',
  registerAsComponent: true,
  title: 'Social Feed',
  description: 'Browse and analyze collected social media posts with sentiment and engagement metrics',
  backButton: true,
  uiSupport: ['material'],
  modules,
  graphql,
  roles: ['USER']
};

export default SocialFeed;
