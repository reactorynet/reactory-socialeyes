import Reactory from '@reactorynet/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Social Feed',
  properties: {
    posts: {
      type: 'array',
      title: 'Posts',
      items: {
        type: 'object',
        title: 'Post by ${formData.author.username}',
        properties: {
          id: { type: 'string', title: 'ID' },
          platform: { type: 'string', title: 'Platform' },
          sourceId: { type: 'string', title: 'Source ID' },
          url: { type: 'string', title: 'URL' },
          author: {
            type: 'object',
            title: 'Author',
            properties: {
              id: { type: 'string', title: 'ID' },
              username: { type: 'string', title: 'Username' },
              name: { type: 'string', title: 'Name' },
              avatar: { type: 'string', title: 'Avatar' },
            }
          },
          content: { type: 'string', title: 'Content' },
          hashtags: {
            type: 'array',
            title: 'Hashtags',
            items: { type: 'string' }
          },
          mentions: {
            type: 'array',
            title: 'Mentions',
            items: { type: 'string' }
          },
          media: {
            type: 'array',
            title: 'Media',
            items: { type: 'string' }
          },
          metrics: {
            type: 'object',
            title: 'Metrics',
            properties: {
              likes: { type: 'number', title: 'Likes' },
              shares: { type: 'number', title: 'Shares' },
              comments: { type: 'number', title: 'Comments' },
              views: { type: 'number', title: 'Views' },
            }
          },
          sentiment: { type: 'number', title: 'Sentiment' },
          publishedAt: { type: 'string', title: 'Published' },
          collectedAt: { type: 'string', title: 'Collected' },
          metadata: { type: 'object', title: 'Metadata' },
        }
      }
    }
  }
};

export default schema;
