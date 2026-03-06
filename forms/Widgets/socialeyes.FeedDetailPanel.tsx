import Reactory from '@reactorynet/reactory-core';

interface DetailPanelDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  PostContent: any;
  PostMetrics: any;
}

interface DetailPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  post: any;
  useCase?: string;
}

const FeedDetailPanel = (props: DetailPanelProps) => {
  const { reactory, post, useCase = 'grid' } = props;

  if (!post) {
    return <div>No post data available</div>;
  }

  const {
    React,
    Material,
    PostContent,
    PostMetrics,
  } = reactory.getComponents<DetailPanelDependencies>([
    'react.React',
    'material-ui.Material',
    'socialeyes.PostContent',
    'socialeyes.PostMetrics',
  ]);

  const { MaterialCore } = Material;
  const { Box, Tabs, Tab, Typography, Icon, Chip, Badge } = MaterialCore;

  const [activeTab, setActiveTab] = React.useState(0);

  const platformColors: Record<string, string> = {
    'x': '#000000',
    'reddit': '#FF4500',
  };

  const sentimentColor = () => {
    if (post.sentiment === null || post.sentiment === undefined) return '#9e9e9e';
    if (post.sentiment > 0.2) return '#4caf50';
    if (post.sentiment < -0.2) return '#f44336';
    return '#757575';
  };

  const sentimentLabel = () => {
    if (post.sentiment === null || post.sentiment === undefined) return 'N/A';
    if (post.sentiment > 0.2) return 'Positive';
    if (post.sentiment < -0.2) return 'Negative';
    return 'Neutral';
  };

  const tabs = [
    {
      id: 'content',
      label: 'Content',
      icon: 'article',
      badge: post.media?.length || 0,
      component: PostContent,
    },
    {
      id: 'metrics',
      label: 'Metrics',
      icon: 'analytics',
      badge: 0,
      component: PostMetrics,
    },
  ];

  const ActiveTabComponent = tabs[activeTab]?.component;

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={post.platform?.toUpperCase()}
            size="small"
            sx={{
              backgroundColor: platformColors[post.platform] || '#757575',
              color: '#fff',
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
            @{post.author?.username}
          </Typography>
          <Chip
            label={sentimentLabel()}
            size="small"
            sx={{
              backgroundColor: sentimentColor(),
              color: '#fff',
            }}
          />
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(e: any, v: number) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              icon={
                tab.badge > 0 ? (
                  <Badge badgeContent={tab.badge} color="primary">
                    <Icon>{tab.icon}</Icon>
                  </Badge>
                ) : (
                  <Icon>{tab.icon}</Icon>
                )
              }
              label={tab.label}
              iconPosition="start"
              sx={{
                minHeight: 56,
                textTransform: 'none',
                fontSize: '0.875rem'
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ p: 0 }}>
        {ActiveTabComponent && (
          <ActiveTabComponent
            post={post}
            reactory={reactory}
          />
        )}
      </Box>
    </Box>
  );
};

const Definition: any = {
  name: 'FeedDetailPanel',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: FeedDetailPanel,
  roles: ['USER']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    FeedDetailPanel,
    ['SocialEyes', 'Feed'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: FeedDetailPanel
  });
}
