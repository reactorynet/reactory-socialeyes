import Reactory from '@reactorynet/reactory-core';

interface AccountListenersProps {
  reactory: Reactory.Client.IReactoryApi;
  account: any;
}

const AccountListeners = (props: AccountListenersProps) => {
  const { reactory, account } = props;

  const { React, Material } = reactory.getComponents<{
    React: Reactory.React;
    Material: Reactory.Client.Web.IMaterialModule;
  }>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const { Box, Typography, List, ListItem, ListItemText, ListItemIcon, Icon, Chip, CircularProgress } = MaterialCore;

  const [listeners, setListeners] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchListeners = async () => {
      try {
        const result = await reactory.graphqlQuery(
          `query SocialEyesListeners($filter: SocialEyesListenerFilter) {
            socialEyesListeners(filter: $filter) {
              id
              name
              platform
              type
              query
              intervalMinutes
              isActive
              lastRun
            }
          }`,
          { filter: { platform: account.provider } }
        );
        setListeners(result?.data?.socialEyesListeners || []);
      } catch (err) {
        reactory.log('Failed to fetch listeners', { err }, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchListeners();
  }, [account.provider]);

  const typeIcons: Record<string, string> = {
    'keyword': 'search',
    'hashtag': 'tag',
    'mention': 'alternate_email',
    'user': 'person',
    'group': 'group',
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (listeners.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Icon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}>hearing_disabled</Icon>
        <Typography variant="body2" color="text.secondary">
          No listeners configured for this platform.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0 }}>
      <List>
        {listeners.map((listener: any) => (
          <ListItem key={listener.id} divider>
            <ListItemIcon>
              <Icon>{typeIcons[listener.type] || 'hearing'}</Icon>
            </ListItemIcon>
            <ListItemText
              primary={listener.name}
              secondary={`${listener.type}: "${listener.query}" - every ${listener.intervalMinutes} min`}
            />
            <Chip
              label={listener.isActive ? 'Active' : 'Inactive'}
              size="small"
              color={listener.isActive ? 'success' : 'default'}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

const Definition: any = {
  name: 'AccountListeners',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: AccountListeners,
  roles: ['USER']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    AccountListeners,
    ['SocialEyes', 'Account'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: AccountListeners
  });
}
