import Reactory from '@reactorynet/reactory-core';

interface ConversationThreadProps {
  reactory: Reactory.Client.IReactoryApi;
  message: any;
}

const ConversationThread = (props: ConversationThreadProps) => {
  const { reactory, message } = props;

  const { React, Material } = reactory.getComponents<{
    React: Reactory.React;
    Material: Reactory.Client.Web.IMaterialModule;
  }>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const { Box, Typography, CircularProgress, Paper, Icon, Divider } = MaterialCore;

  const [messages, setMessages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchConversation = async () => {
      if (!message.conversationId) {
        setMessages([message]);
        setLoading(false);
        return;
      }

      try {
        const result = await reactory.graphqlQuery(
          `query SocialEyesConversation($conversationId: String!, $paging: PagingRequest) {
            socialEyesConversation(conversationId: $conversationId, paging: $paging) {
              messages {
                id
                platform
                from { id username name }
                to { id username name }
                content
                isIncoming
                readAt
                sentAt
              }
            }
          }`,
          { conversationId: message.conversationId, paging: { page: 1, pageSize: 50 } }
        );
        const msgs = result?.data?.socialEyesConversation?.messages || [message];
        setMessages(msgs);
      } catch (err) {
        reactory.log('Failed to fetch conversation', { err }, 'error');
        setMessages([message]);
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [message.conversationId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
      {messages.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Icon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}>chat_bubble_outline</Icon>
          <Typography variant="body2" color="text.secondary">
            No messages in this conversation.
          </Typography>
        </Box>
      ) : (
        messages.map((msg: any, idx: number) => (
          <Box key={msg.id || idx}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 1,
                ml: msg.isIncoming ? 0 : 4,
                mr: msg.isIncoming ? 4 : 0,
                backgroundColor: msg.isIncoming ? '#f5f5f5' : '#e3f2fd',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  @{msg.from?.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : ''}
                </Typography>
              </Box>
              <Typography variant="body2">
                {msg.content}
              </Typography>
            </Paper>
            {idx < messages.length - 1 && <Divider sx={{ my: 0.5, opacity: 0 }} />}
          </Box>
        ))
      )}
    </Box>
  );
};

const Definition: any = {
  name: 'ConversationThread',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: ConversationThread,
  roles: ['USER']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    ConversationThread,
    ['SocialEyes', 'Messages'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: ConversationThread
  });
}
