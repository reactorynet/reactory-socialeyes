import Reactory from '@reactorynet/reactory-core';
import version from './version';
import schema from './schema';
import { GridUISchema, ListUiSchema } from './uiSchema';
import modules from './modules';
import graphql from './graphql';

const name = 'SocialAccounts';
const nameSpace = 'socialeyes';

const SocialAccounts: Reactory.Forms.IReactoryForm = {
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
  title: 'Social Accounts',
  description: 'Manage connected social media accounts across platforms',
  backButton: true,
  uiSupport: ['material'],
  modules,
  graphql,
  roles: ['USER']
};

export default SocialAccounts;
