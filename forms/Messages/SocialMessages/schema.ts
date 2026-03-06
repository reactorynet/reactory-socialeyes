import Reactory from '@reactorynet/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Social Messages',
  properties: {
    messages: {
      type: 'array',
      title: 'Messages',
      items: {
        type: 'object',
        title: 'Message from ${formData.from.username}',
        properties: {
          id: { type: 'string', title: 'ID' },
          platform: { type: 'string', title: 'Platform' },
          sourceId: { type: 'string', title: 'Source ID' },
          conversationId: { type: 'string', title: 'Conversation ID' },
          from: {
            type: 'object',
            title: 'From',
            properties: {
              id: { type: 'string', title: 'ID' },
              username: { type: 'string', title: 'Username' },
              name: { type: 'string', title: 'Name' },
            }
          },
          to: {
            type: 'array',
            title: 'To',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', title: 'ID' },
                username: { type: 'string', title: 'Username' },
                name: { type: 'string', title: 'Name' },
              }
            }
          },
          content: { type: 'string', title: 'Content' },
          attachments: {
            type: 'array',
            title: 'Attachments',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', title: 'Type' },
                url: { type: 'string', title: 'URL' },
              }
            }
          },
          isIncoming: { type: 'boolean', title: 'Incoming' },
          readAt: { type: 'string', title: 'Read At' },
          sentAt: { type: 'string', title: 'Sent At' },
          metadata: { type: 'object', title: 'Metadata' },
        }
      }
    }
  }
};

export default schema;
