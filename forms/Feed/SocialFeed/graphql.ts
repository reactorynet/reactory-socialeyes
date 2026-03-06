import Reactory from '@reactorynet/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  mutation: {},

  queries: {
    feedPosts: {
      name: 'socialEyesFeed',
      text: `query SocialEyesFeed($filter: SocialEyesFeedFilter, $paging: PagingRequest) {
        socialEyesFeed(filter: $filter, paging: $paging) {
          paging {
            page
            pageSize
            hasNext
            total
          }
          posts {
            id
            platform
            sourceId
            url
            author {
              id
              username
              name
              avatar
            }
            content
            hashtags
            mentions
            media
            metrics {
              likes
              shares
              comments
              views
            }
            sentiment
            publishedAt
            collectedAt
            metadata
          }
        }
      }`,
      resultType: 'object',
      resultMap: {
        'paging': 'paging',
        'posts': 'data'
      }
    }
  }
};

export default graphql;
