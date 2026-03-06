import Reactory from '@reactorynet/reactory-core';

interface AccountOverviewProps {
  reactory: Reactory.Client.IReactoryApi;
  account: any;
}

const AccountOverview = (props: AccountOverviewProps) => {
  const { reactory, account } = props;

  const { React, Material } = reactory.getComponents<{
    React: Reactory.React;
    Material: Reactory.Client.Web.IMaterialModule;
  }>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const { Box, Typography, Chip, Avatar, Divider, List, ListItem, ListItemText, ListItemIcon, Icon } = MaterialCore;

  const fields = [
    { icon: 'badge', label: 'Platform Account ID', value: account.providerAccountId },
    { icon: 'email', label: 'Email', value: account.email || 'Not provided' },
    { icon: 'link', label: 'Profile URL', value: account.profileUrl, isLink: true },
    { icon: 'event', label: 'Connected', value: account.createdAt ? new Date(account.createdAt).toLocaleString() : 'Unknown' },
    { icon: 'update', label: 'Last Updated', value: account.updatedAt ? new Date(account.updatedAt).toLocaleString() : 'Unknown' },
  ];

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
