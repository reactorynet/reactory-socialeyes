import Reactory from '@reactorynet/reactory-core';

interface AccountOverviewDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  EditAccountDialog: any;
}

interface AccountOverviewProps {
  reactory: Reactory.Client.IReactoryApi;
  account: any;
  onAccountUpdated?: (account: any) => void;
}

const AccountOverview = (props: AccountOverviewProps) => {
  const { reactory, account, onAccountUpdated } = props;

  const { React, Material, EditAccountDialog } = reactory.getComponents<AccountOverviewDependencies>([
    'react.React',
    'material-ui.Material',
    'socialeyes.EditAccountDialog',
  ]);

  const { MaterialCore } = Material;
  const {
    Box,
    Typography,
    Chip,
    Avatar,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Icon,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Alert,
    CircularProgress,
  } = MaterialCore;

  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [disconnectError, setDisconnectError] = React.useState<string | null>(null);

  const fields = [
    { icon: 'badge', label: 'Platform Account ID', value: account.providerAccountId },
    { icon: 'email', label: 'Email', value: account.email || 'Not provided' },
    { icon: 'link', label: 'Profile URL', value: account.profileUrl, isLink: true },
    { icon: 'event', label: 'Connected', value: account.createdAt ? new Date(account.createdAt).toLocaleString() : 'Unknown' },
    { icon: 'update', label: 'Last Updated', value: account.updatedAt ? new Date(account.updatedAt).toLocaleString() : 'Unknown' },
  ];

  const handleEditComplete = (updatedAccount?: any) => {
    setEditDialogOpen(false);
    if (updatedAccount && onAccountUpdated) {
      onAccountUpdated(updatedAccount);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setDisconnectError(null);

    try {
      const result = await reactory.graphqlMutation(
        `mutation SocialEyesDisconnectAccount($id: ID!) {
          socialEyesDisconnectAccount(id: $id) {
            id
            provider
            providerAccountId
            name
            email
            avatar
            profileUrl
            isActive
            scopes
            createdAt
            updatedAt
          }
        }`,
        { id: account.id },
        {},
      );

      if (result.errors && result.errors.length > 0) {
        setDisconnectError(result.errors.map((e: any) => e.message).join('; '));
        setDisconnecting(false);
        return;
      }

      setDisconnecting(false);
      setDisconnectDialogOpen(false);
      if (onAccountUpdated) {
        onAccountUpdated(result.data?.socialEyesDisconnectAccount);
      }
    } catch (err: any) {
      setDisconnectError(err.message || 'Failed to disconnect account');
      setDisconnecting(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Profile Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        {account.avatar && (
          <Avatar src={account.avatar} sx={{ width: 64, height: 64 }} />
        )}
        <Box>
          <Typography variant="h6">{account.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {account.provider?.toUpperCase()} Account
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Details */}
      <List dense>
        {fields.map((field) => (
          <ListItem key={field.label}>
            <ListItemIcon>
              <Icon>{field.icon}</Icon>
            </ListItemIcon>
            <ListItemText
              primary={field.label}
              secondary={
                field.isLink && field.value ? (
                  <Typography
                    component="a"
                    href={field.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    color="primary"
                  >
                    {field.value}
                  </Typography>
                ) : (
                  field.value
                )
              }
            />
          </ListItem>
        ))}
      </List>

      {/* Scopes */}
      {account.scopes && account.scopes.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>OAuth Scopes</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {account.scopes.map((scope: string) => (
              <Chip key={scope} label={scope} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
      )}

      {/* Action Buttons */}
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<Icon>edit</Icon>}
          onClick={() => setEditDialogOpen(true)}
        >
          Edit Account
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Icon>link_off</Icon>}
          onClick={() => setDisconnectDialogOpen(true)}
          disabled={!account.isActive}
        >
          Disconnect
        </Button>
      </Box>

      {/* Edit Account Dialog */}
      {EditAccountDialog && (
        <EditAccountDialog
          reactory={reactory}
          open={editDialogOpen}
          account={account}
          onComplete={handleEditComplete}
          onCancel={() => setEditDialogOpen(false)}
        />
      )}

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={disconnectDialogOpen}
        onClose={() => !disconnecting && setDisconnectDialogOpen(false)}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon color="error">warning</Icon>
          Disconnect {account.name}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to disconnect the {account.provider?.toUpperCase()} account
            "{account.name}"? This will deactivate the account and stop all listeners
            associated with it.
          </DialogContentText>
          {disconnectError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {disconnectError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDisconnectDialogOpen(false)}
            disabled={disconnecting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDisconnect}
            color="error"
            variant="contained"
            disabled={disconnecting}
            startIcon={disconnecting ? <CircularProgress size={18} /> : <Icon>link_off</Icon>}
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const Definition: any = {
  name: 'AccountOverview',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: AccountOverview,
  roles: ['USER']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    AccountOverview,
    ['SocialEyes', 'Account'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: AccountOverview
  });
}
