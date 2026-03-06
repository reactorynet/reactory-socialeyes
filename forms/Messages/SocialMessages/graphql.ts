import Reactory from '@reactorynet/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  mutation: {
    reply: {
      name: 'socialEyesReplyToMessage',
      text: `mutation SocialEyesReplyToMessage($messageId: ID!, $content: String!) {
        socialEyesReplyToMessage(messageId: $messageId, content: $content) {
          id
          platform
          sourceId
          conversationId
          content
          sentAt
        }
      }`,
      variables: {
        'formData.id': 'messageId',
        'formData.replyContent': 'content',
      },
      resultMap: {
        'id': 'id',
        'content': 'content',
        'sentAt': 'sentAt',
      }
    },
    markRead: {
      name: 'socialEyesMarkMessageRead',
      text: `mutation SocialEyesMarkMessageRead($id: ID!) {
        socialEyesMarkMessageRead(id: $id) {
          id
          readAt
        }
      }`,
      variables: {
        'formData.id': 'id'
      },
      resultMap: {
        'id': 'id',
        'readAt': 'readAt',
      }
    },
    send: {
      name: 'socialEyesSendMessage',
      text: `mutation SocialEyesSendMessage($input: SocialEyesSendMessageInput!) {
        socialEyesSendMessage(input: $input) {
          id
          platform
          sourceId
          conversationId
          content
          sentAt
        }
      }`,
      variables: {
        'formData.accountId': 'input.accountId',
        'formData.to': 'input.to',
        'formData.content': 'input.content',
      },
      resultMap: {
        'id': 'id',
        'content': 'content',
        'sentAt': 'sentAt',
      }
    },
    syncInbox: {
      name: 'socialEyesSyncInbox',
      text: `mutation SocialEyesSyncInbox($accountId: ID!) {
        socialEyesSyncInbox(accountId: $accountId) {
          newMessages
        }
      }`,
      variables: {
        'formData.accountId': 'accountId'
      },
      resultMap: {
        'newMessages': 'newMessages',
      }
    }
  },

  queries: {
    inbox: {
      name: 'socialEyesInbox',
      text: `query SocialEyesInbox($paging: PagingRequest) {
        socialEyesInbox(paging: $paging) {
          paging {
            page
            pageSize
            hasNext
            total
          }
          messages {
            id
            platform
            sourceId
            conversationId
            from {
              id
              username
              name
            }
            to {
              id
              username
              name
            }
            content
            attachments {
              type
              url
            }
            isIncoming
            readAt
            sentAt
            metadata
          }
        }
      }`,
      resultType: 'object',
      resultMap: {
        'paging': 'paging',
        'messages': 'data'
      }
    },
    conversation: {
      name: 'socialEyesConversation',
      text: `query SocialEyesConversation($conversationId: String!, $paging: PagingRequest) {
        socialEyesConversation(conversationId: $conversationId, paging: $paging) {
          paging {
            page
            pageSize
            hasNext
            total
          }
          messages {
            id
            platform
            sourceId
            conversationId
            from {
              id
              username
              name
            }
            to {
              id
              username
              name
            }
            content
            attachments {
              type
              url
            }
            isIncoming
            readAt
            sentAt
          }
        }
      }`,
      resultType: 'object',
      resultMap: {
        'paging': 'paging',
        'messages': 'data'
      }
    }
  }
};

export default graphql;
