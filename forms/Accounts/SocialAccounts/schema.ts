import Reactory from '@reactorynet/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Social Accounts',
  properties: {
    accounts: {
      type: 'array',
      title: 'Accounts',
      items: {
        type: 'object',
        title: '${formData.name}',
        properties: {
          id: { type: 'string', title: 'ID' },
          provider: { type: 'string', title: 'Platform' },
          providerAccountId: { type: 'string', title: 'Account ID' },
          name: { type: 'string', title: 'Name' },
          email: { type: 'string', title: 'Email' },
          avatar: { type: 'string', title: 'Avatar' },
          profileUrl: { type: 'string', title: 'Profile URL' },
          isActive: { type: 'boolean', title: 'Active' },
          scopes: {
            type: 'array',
            title: 'Scopes',
            items: { type: 'string' }
          },
          metadata: { type: 'object', title: 'Metadata' },
          createdAt: { type: 'string', title: 'Connected' },
          updatedAt: { type: 'string', title: 'Updated' },
        }
      }
    }
  }
};

export default schema;
