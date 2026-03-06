import Reactory from '@reactorynet/reactory-core';

interface DetailPanelDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  ConversationThread: any;
  MessageReply: any;
}

interface DetailPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  message: any;
  useCase?: string;
}

const MessageDetailPanel = (props: DetailPanelProps) => {
  const { reactory, message, useCase = 'grid' } = props;

  if (!message) {
    return <div>No message data available</div>;
  }

  const {
    React,
    Material,
    ConversationThread,
    MessageReply,
  } = reactory.getComponents<DetailPanelDependencies>([
    'react.React',
    'material-ui.Material',
    'socialeyes.ConversationThread',
    'socialeyes.MessageReply',
  ]);

  const { MaterialCore } = Material;
  const { Box, Tabs, Tab, Typography, Icon, Chip, Badge } = MaterialCore;

  const [activeTab, setActiveTab] = React.useState(0);

  const platformColors: Record<string, string> = {
    'x': '#000000',
    'reddit': '#FF4500',
  };

  const tabs = [
    {
      id: 'conversation',
      label: 'Conversation',
      icon: 'chat',
      badge: 0,
      component: ConversationThread,
    },
    {
      id: 'reply',
      label: 'Reply',
      icon: 'reply',
      badge: 0,
      component: MessageReply,
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
            label={message.platform?.toUpperCase()}
            size="small"
            sx={{
              backgroundColor: platformColors[message.platform] || '#757575',
              color: '#fff',
            }}
          />
          <Icon>{message.isIncoming ? 'call_received' : 'call_made'}</Icon>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {message.isIncoming ? 'From' : 'To'}: @{message.isIncoming ? message.from?.username : message.to?.[0]?.username}
          </Typography>
          <Chip
            label={message.readAt ? 'Read' : 'Unread'}
            size="small"
            color={message.readAt ? 'success' : 'warning'}
            icon={<Icon>{message.readAt ? 'mark_email_read' : 'mark_email_unread'}</Icon>}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {message.sentAt ? new Date(message.sentAt).toLocaleString() : ''}
        </Typography>
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
              icon={<Icon>{tab.icon}</Icon>}
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
            message={message}
            reactory={reactory}
          />
        )}
      </Box>
    </Box>
  );
};

const Definition: any = {
  name: 'MessageDetailPanel',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: MessageDetailPanel,
  roles: ['USER']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    MessageDetailPanel,
    ['SocialEyes', 'Messages'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: MessageDetailPanel
  });
}
