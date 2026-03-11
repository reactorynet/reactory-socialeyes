import { queryGraph } from '@reactory/server-core/graph/ReactoryApolloClient';
import { ChatState, Macro, MacroComponentDefinition } from '@reactory/server-modules/reactory-reactor/ai/openai/types/chat';
import logger from '@reactory/server-core/logging';
import {
  GetFeedProps,
  SocialPostResult,
  PagingResult,
  SocialEyesMacroResult,
} from '../types';

const GET_FEED_QUERY = `
  query SocialEyesFeed($filter: SocialEyesFeedFilter, $paging: PagingRequest) {
    socialEyesFeed(filter: $filter, paging: $paging) {
      paging {
        total
        page
        pageSize
        hasNext
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
      }
    }
  }
`;

export interface GetFeedData {
  paging: PagingResult;
  posts: SocialPostResult[];
}

export const GetFeed: Macro<SocialEyesMacroResult<GetFeedData>, GetFeedProps> = async (
  props: GetFeedProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<GetFeedData>> => {
  const startTime = Date.now();
  const { platform, dateFrom, dateTo, search, listenerId, page = 1, pageSize = 25 } = props;

  try {
    const filter: Record<string, unknown> = {};
    if (platform) filter.platform = platform;
    if (dateFrom) filter.dateFrom = dateFrom;
    if (dateTo) filter.dateTo = dateTo;
    if (search) filter.search = search;
    if (listenerId) filter.listenerId = listenerId;

    const result = await queryGraph(
      GET_FEED_QUERY,
      { filter: Object.keys(filter).length ? filter : undefined, paging: { page, pageSize } },
      {},
      state.context,
    );

    const feedData = result?.socialEyesFeed;
    const posts: SocialPostResult[] = feedData?.posts ?? [];
    const paging: PagingResult = feedData?.paging ?? { total: 0, page, pageSize, hasNext: false };
    const ms = Date.now() - startTime;

    // Quick sentiment tally for the instructions summary
    const sentimentCounts = posts.reduce(
      (acc, p) => {
        if (p.sentiment == null) return acc;
        if (p.sentiment > 0.1) acc.positive++;
        else if (p.sentiment < -0.1) acc.negative++;
        else acc.neutral++;
        return acc;
      },
      { positive: 0, negative: 0, neutral: 0 },
    );

    // Platform breakdown
    const platformMap: Record<string, number> = {};
    posts.forEach((p) => { platformMap[p.platform] = (platformMap[p.platform] ?? 0) + 1; });
    const platformBreakdown = Object.entries(platformMap).map(([k, v]) => `${k}: ${v}`).join(', ');

    logger.info(`socialEyesGetFeed: returned ${posts.length} posts in ${ms}ms`);

    return {
      success: true,
      data: { paging, posts },
      tool: 'socialEyesFeed',
      params: props,
      instructions: `
## Social Feed — ${posts.length} posts (page ${paging.page} of ${Math.ceil(paging.total / paging.pageSize) || 1})

Fetched in ${ms}ms. Total matching posts: ${paging.total}. ${paging.hasNext ? 'More pages available.' : 'No further pages.'}

### Platform Breakdown
${platformBreakdown || 'N/A'}

### Sentiment Summary (posts with sentiment scores)
- Positive: ${sentimentCounts.positive}
- Negative: ${sentimentCounts.negative}
- Neutral: ${sentimentCounts.neutral}

### Available Fields Per Post
id, platform, sourceId, url, author (id/username/name/avatar), content, hashtags, mentions,
media, metrics (likes/shares/comments/views), sentiment (-1 to 1), publishedAt, collectedAt.

To see posts from a specific listener, set listenerId. To search content, use the search param.
To get the next page, increment page by 1.
`,
    };
  } catch (error) {
    logger.error('socialEyesGetFeed error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesFeed', params: props };
  }
};

export const GetFeedRegistry: MacroComponentDefinition<typeof GetFeed> = {
  component: GetFeed,
  name: 'socialEyesFeed',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Get the aggregated social feed with filtering by platform, date range, keyword search, or specific listener. Returns paginated posts with author, content, hashtags, metrics, and sentiment.',
  roles: ['USER'],
  stem: 'socialEyesFeed',
  tags: ['social', 'feed', 'posts', 'monitoring', 'sentiment'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesFeed',
      description: 'Retrieve the aggregated social media feed. Filter by platform, date range, search query, or listener. Returns posts with content, author, metrics, hashtags, and sentiment scores.',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'Filter by platform: x, reddit, facebook, or instagram' },
          dateFrom: { type: 'string', description: 'ISO date — only return posts published after this date' },
          dateTo: { type: 'string', description: 'ISO date — only return posts published before this date' },
          search: { type: 'string', description: 'Full-text search within post content' },
          listenerId: { type: 'string', description: 'Filter to posts captured by a specific listener ID' },
          page: { type: 'number', description: 'Page number (default: 1)' },
          pageSize: { type: 'number', description: 'Posts per page (default: 25, max: 100)' },
        },
        required: [],
      },
    },
  }],
};
