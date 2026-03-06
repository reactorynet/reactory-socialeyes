import Reactory from '@reactorynet/reactory-core';

interface DetailPanelDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  AccountOverview: any;
  AccountListeners: any;
}

interface DetailPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  account: any;
  useCase?: string;
}

const AccountDetailPanel = (props: DetailPanelProps) => {
  const { reactory, account, useCase = 'grid' } = props;

  if (!account) {
    return <div>No account data available</div>;
  }

  const {
    React,
    Material,
    AccountOverview,
    AccountListeners,
  } = reactory.getComponents<DetailPanelDependencies>([
    'react.React',
    'material-ui.Material',
    'socialeyes.AccountOverview',
    'socialeyes.AccountListeners',
  ]);

  const { MaterialCore } = Material;
  const { Box, Tabs, Tab, Typography, Icon, Chip } = MaterialCore;

  const [activeTab, setActiveTab] = React.useState(0);

  const platformColors: Record<string, string> = {
    'x': '#000000',
    'reddit': '#FF4500',
  };

  const platformIcons: Record<string, string> = {
    'x': 'tag',
    'reddit': 'forum',
  };

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'info',
      component: AccountOverview,
    },
    {
      id: 'listeners',
      label: 'Listeners',
      icon: 'hearing',
      component: AccountListeners,
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
          <Icon sx={{ color: platformColors[account.provider] || '#757575' }}>
            {platformIcons[account.provider] || 'public'}
          </Icon>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600 }}
          >
            {account.name}
          </Typography>
          <Chip
            label={account.isActive ? 'Active' : 'Inactive'}
            size="small"
            color={account.isActive ? 'success' : 'default'}
            icon={<Icon>{account.isActive ? 'check_circle' : 'cancel'}</Icon>}
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
            account={account}
            reactory={reactory}
          />
        )}
      </Box>
    </Box>
  );
};

const Definition: any = {
  name: 'AccountDetailPanel',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: AccountDetailPanel,
  roles: ['USER']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    AccountDetailPanel,
    ['SocialEyes', 'Account'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: AccountDetailPanel
  });
}
