import Reactory from '@reactorynet/reactory-core';

interface MessageReplyProps {
  reactory: Reactory.Client.IReactoryApi;
  message: any;
}

const MessageReply = (props: MessageReplyProps) => {
  const { reactory, message } = props;

  const { React, Material } = reactory.getComponents<{
    React: Reactory.React;
    Material: Reactory.Client.Web.IMaterialModule;
  }>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const { Box, Typography, TextField, Button, Icon, Alert } = MaterialCore;

  const [replyContent, setReplyContent] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSendReply = React.useCallback(async () => {
    if (!replyContent.trim()) return;

    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      await reactory.graphqlMutation(
        `mutation SocialEyesReplyToMessage($messageId: ID!, $content: String!) {
          socialEyesReplyToMessage(messageId: $messageId, content: $content) {
            id
            content
            sentAt
          }
        }`,
        { messageId: message.id, content: replyContent }
      );
      setSuccess(true);
      setReplyContent('');
      reactory.createNotification('Reply sent successfully', { showInAppNotification: true, type: 'success' });
    } catch (err: any) {
      setError(err?.message || 'Failed to send reply');
      reactory.createNotification('Failed to send reply', { showInAppNotification: true, type: 'error' });
    } finally {
      setSending(false);
    }
  }, [replyContent, message.id, reactory]);

  return (
    <Box sx={{ p: 2 }}>
      {/* Original Message Preview */}
      <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1, borderLeft: '3px solid #1976d2' }}>
        <Typography variant="caption" color="text.secondary">
          Replying to @{message.from?.username}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {message.content?.length > 200 ? message.content.substring(0, 200) + '...' : message.content}
        </Typography>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Reply sent successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Reply Input */}
      <TextField
        fullWidth
        multiline
        rows={4}
        variant="outlined"
        placeholder="Type your reply..."
        value={replyContent}
        onChange={(e: any) => setReplyContent(e.target.value)}
        disabled={sending}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<Icon>{sending ? 'hourglass_empty' : 'send'}</Icon>}
          onClick={handleSendReply}
          disabled={sending || !replyContent.trim()}
        >
          {sending ? 'Sending...' : 'Send Reply'}
        </Button>
      </Box>
    </Box>
  );
};

const Definition: any = {
  name: 'MessageReply',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: MessageReply,
  roles: ['USER']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    MessageReply,
    ['SocialEyes', 'Messages'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: MessageReply
  });
}
