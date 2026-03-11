import Reactory from '@reactorynet/reactory-core';

interface AccountListenersDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  CreateListenerDialog: any;
}

interface AccountListenersProps {
  reactory: Reactory.Client.IReactoryApi;
  account: any;
}

const AccountListeners = (props: AccountListenersProps) => {
  const { reactory, account } = props;

  const { React, Material, CreateListenerDialog } = reactory.getComponents<AccountListenersDependencies>([
    'react.React',
    'material-ui.Material',
    'socialeyes.CreateListenerDialog',
  ]);

  const { MaterialCore } = Material;
  const { Box, Typography, List, ListItem, ListItemText, ListItemIcon, Icon, Chip, CircularProgress, Button } = MaterialCore;

  const [listeners, setListeners] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const fetchListeners = async () => {
    setLoading(true);
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

  React.useEffect(() => {
    fetchListeners();
  }, [account.provider]);

  const handleCreateComplete = (newListener?: any) => {
    setCreateDialogOpen(false);
    if (newListener) {
      fetchListeners();
    }
  };

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

  return (
    <Box sx={{ p: 0 }}>
      {/* Header with Add button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 2, pb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {listeners.length} listener{listeners.length !== 1 ? 's' : ''} configured
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Icon>add</Icon>}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add Listener
        </Button>
      </Box>

      {listeners.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Icon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}>hearing_disabled</Icon>
          <Typography variant="body2" color="text.secondary">
            No listeners configured for this platform.
          </Typography>
        </Box>
      ) : (
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
      )}

      {/* Create Listener Dialog */}
      {CreateListenerDialog && (
        <CreateListenerDialog
          reactory={reactory}
          open={createDialogOpen}
          account={account}
          onComplete={handleCreateComplete}
          onCancel={() => setCreateDialogOpen(false)}
        />
      )}
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
