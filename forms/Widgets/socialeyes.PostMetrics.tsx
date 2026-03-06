import Reactory from '@reactorynet/reactory-core';

interface PostMetricsProps {
  reactory: Reactory.Client.IReactoryApi;
  post: any;
}

const PostMetrics = (props: PostMetricsProps) => {
  const { reactory, post } = props;

  const { React, Material } = reactory.getComponents<{
    React: Reactory.React;
    Material: Reactory.Client.Web.IMaterialModule;
  }>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const { Box, Typography, Icon, Paper, Grid } = MaterialCore;

  const metrics = post.metrics || {};

  const metricCards = [
    {
      label: 'Likes',
      value: metrics.likes || 0,
      icon: 'favorite',
      color: '#e91e63',
    },
    {
      label: 'Shares',
      value: metrics.shares || 0,
      icon: 'share',
      color: '#1976d2',
    },
    {
      label: 'Comments',
      value: metrics.comments || 0,
      icon: 'comment',
      color: '#ff9800',
    },
    {
      label: 'Views',
      value: metrics.views || 0,
      icon: 'visibility',
      color: '#9c27b0',
    },
  ];

  const sentimentScore = post.sentiment;
  const sentimentColor = sentimentScore > 0.2 ? '#4caf50' : sentimentScore < -0.2 ? '#f44336' : '#757575';
  const sentimentLabel = sentimentScore > 0.2 ? 'Positive' : sentimentScore < -0.2 ? 'Negative' : 'Neutral';

  return (
    <Box sx={{ p: 2 }}>
      {/* Engagement Metrics */}
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
        Engagement Metrics
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {metricCards.map((metric) => (
          <Grid item xs={6} sm={3} key={metric.label}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                textAlign: 'center',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Icon sx={{ fontSize: 32, color: metric.color, mb: 1 }}>{metric.icon}</Icon>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {metric.value.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {metric.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Sentiment Score */}
      {sentimentScore !== null && sentimentScore !== undefined && (
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Sentiment Analysis
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Icon sx={{ fontSize: 40, color: sentimentColor }}>
              {sentimentScore > 0.2 ? 'sentiment_satisfied' : sentimentScore < -0.2 ? 'sentiment_dissatisfied' : 'sentiment_neutral'}
            </Icon>
            <Box>
              <Typography variant="h6" sx={{ color: sentimentColor, fontWeight: 600 }}>
                {sentimentLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Score: {sentimentScore.toFixed(2)}
              </Typography>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Collection Info */}
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          Published: {post.publishedAt ? new Date(post.publishedAt).toLocaleString() : 'Unknown'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Collected: {post.collectedAt ? new Date(post.collectedAt).toLocaleString() : 'Unknown'}
        </Typography>
      </Box>
    </Box>
  );
};

const Definition: any = {
  name: 'PostMetrics',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: PostMetrics,
  roles: ['USER']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    PostMetrics,
    ['SocialEyes', 'Feed'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: PostMetrics
  });
}
