import Reactory from '@reactorynet/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  mutation: {
    connect: {
      name: 'socialEyesConnectAccount',
      text: `mutation SocialEyesConnectAccount($input: SocialEyesConnectAccountInput!) {
        socialEyesConnectAccount(input: $input) {
          id
          provider
          providerAccountId
          name
          email
          avatar
          profileUrl
          isActive
          scopes
          createdAt
          updatedAt
        }
      }`,
      variables: {
        'formData': 'input'
      },
      resultMap: {
        'id': 'id',
        'provider': 'provider',
        'providerAccountId': 'providerAccountId',
        'name': 'name',
        'email': 'email',
        'avatar': 'avatar',
        'profileUrl': 'profileUrl',
        'isActive': 'isActive',
        'scopes': 'scopes',
        'createdAt': 'createdAt',
        'updatedAt': 'updatedAt'
      }
    },
    disconnect: {
      name: 'socialEyesDisconnectAccount',
      text: `mutation SocialEyesDisconnectAccount($id: ID!) {
        socialEyesDisconnectAccount(id: $id) {
          id
          provider
          name
          isActive
        }
      }`,
      variables: {
        'formData.id': 'id'
      },
      resultMap: {
        'id': 'id',
        'provider': 'provider',
        'name': 'name',
        'isActive': 'isActive'
      }
    },
    refresh: {
      name: 'socialEyesRefreshAccount',
      text: `mutation SocialEyesRefreshAccount($id: ID!) {
        socialEyesRefreshAccount(id: $id) {
          id
          provider
          name
          isActive
          updatedAt
        }
      }`,
      variables: {
        'formData.id': 'id'
      },
      resultMap: {
        'id': 'id',
        'provider': 'provider',
        'name': 'name',
        'isActive': 'isActive',
        'updatedAt': 'updatedAt'
      }
    }
  },

  queries: {
    listAccounts: {
      name: 'socialEyesAccounts',
      text: `query SocialEyesAccounts($filter: SocialEyesAccountFilter) {
        socialEyesAccounts(filter: $filter) {
          id
          provider
          providerAccountId
          name
          email
          avatar
          profileUrl
          isActive
          scopes
          metadata
          createdAt
          updatedAt
        }
      }`,
      resultType: 'array',
      resultMap: {
        '[]': 'data'
      }
    }
  }
};

export default graphql;
