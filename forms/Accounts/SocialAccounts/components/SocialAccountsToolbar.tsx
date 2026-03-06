import Reactory from '@reactorynet/reactory-core';

interface QuickFilterDefinition {
  id: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'default';
  filter: {
    field: string;
    value: any;
    operator: 'eq' | 'ne' | 'in' | 'is-null' | 'contains';
  };
  badge?: string | number;
}

interface SocialAccountsToolbarDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  QuickFilters: any;
  SearchBar: any;
  ConnectAccountDialog: any;
}

interface SocialAccountsToolbarProps {
  reactory: Reactory.Client.IReactoryApi;
  data: {
    data?: any[];
    selected?: any[] | null;
  };
  onDataChange?: (filteredData: any[]) => void;
  searchText?: string;
  onSearchChange?: (text: string) => void;
}

const SocialAccountsToolbar = (props: SocialAccountsToolbarProps) => {
  const {
    reactory,
    data,
    onDataChange,
    searchText = '',
    onSearchChange,
  } = props;

  const {
    React,
    Material,
    QuickFilters,
    SearchBar,
    ConnectAccountDialog,
  } = reactory.getComponents<SocialAccountsToolbarDependencies>([
    'react.React',
    'material-ui.Material',
    'core.QuickFilters',
    'core.SearchBar',
    'socialeyes.ConnectAccountDialog@1.0.0',
  ]);

  const { MaterialCore } = Material;
  const { Box, Button, Icon, Toolbar, Tooltip } = MaterialCore;

  if (!QuickFilters || !SearchBar) {
    return (
      <Toolbar sx={{ p: 2 }}>
        <Box>Loading filters...</Box>
      </Toolbar>
    );
  }

  const [originalData] = React.useState(data);
  const [connectDialogOpen, setConnectDialogOpen] = React.useState(false);

  const counts = React.useMemo(() => {
    return {
      active: data?.data?.filter((a: any) => a.isActive).length || 0,
      inactive: data?.data?.filter((a: any) => !a.isActive).length || 0,
      x: data?.data?.filter((a: any) => a.provider === 'x').length || 0,
      reddit: data?.data?.filter((a: any) => a.provider === 'reddit').length || 0,
    };
  }, [data]);

  const quickFilters: QuickFilterDefinition[] = [
    {
      id: 'active',
      label: 'Active',
      icon: 'check_circle',
      color: 'success',
      filter: { field: 'isActive', value: true, operator: 'eq' },
      badge: counts.active,
    },
    {
      id: 'inactive',
      label: 'Inactive',
      icon: 'cancel',
      color: 'default',
      filter: { field: 'isActive', value: false, operator: 'eq' },
      badge: counts.inactive,
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      icon: 'tag',
      color: 'primary',
      filter: { field: 'provider', value: 'x', operator: 'eq' },
      badge: counts.x,
    },
    {
      id: 'reddit',
      label: 'Reddit',
      icon: 'forum',
      color: 'warning',
      filter: { field: 'provider', value: 'reddit', operator: 'eq' },
      badge: counts.reddit,
    },
  ];

  const handleSearch = React.useCallback((text: string) => {
    if (onSearchChange) {
      onSearchChange(text);
    }

    if (!text.trim()) {
      onDataChange(originalData);
      return;
    }

    const searchLower = text.toLowerCase();
    const filtered = originalData?.data?.filter((account: any) => {
      return (
        account.name?.toLowerCase().includes(searchLower) ||
        account.provider?.toLowerCase().includes(searchLower) ||
        account.email?.toLowerCase().includes(searchLower) ||
        account.providerAccountId?.toLowerCase().includes(searchLower)
      );
    });

    onDataChange(filtered);
  }, [originalData, onDataChange, onSearchChange]);

  const handleQuickFilterChange = React.useCallback((activeFilters: string[]) => {
    if (activeFilters.length === 0) {
      onDataChange(originalData);
      return;
    }

    const activeFilterDefs = quickFilters.filter(f => activeFilters.includes(f.id));

    const filtered = originalData?.data?.filter((item: any) => {
      return activeFilterDefs.some(filterDef => {
        const { field, value, operator } = filterDef.filter;
        const fieldValue = field.split('.').reduce((obj: any, key: string) => obj?.[key], item);

        switch (operator) {
          case 'eq':
            return fieldValue === value;
          case 'in':
            return Array.isArray(value) && value.includes(fieldValue);
          default:
            return false;
        }
      });
    });

    onDataChange(filtered);
  }, [originalData, onDataChange, quickFilters]);

  const handleConnectComplete = (account?: any) => {
    setConnectDialogOpen(false);
    if (account) {
      // Trigger a data refresh by notifying the parent form
      // Adding the new account to the existing data triggers a re-render
      if (originalData?.data) {
        onDataChange({ ...originalData, data: [account, ...originalData.data] });
      }
    }
  };

  return (
    <>
      <Toolbar
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 2,
          p: 2,
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <SearchBar
            placeholder="Search accounts by name, platform, or email..."
            onSearch={handleSearch}
            initialValue={searchText}
            debounceDelay={300}
            showHelpTooltip
            helpText="Search in account name, platform, email, and account ID"
            fullWidth
          />
          <Tooltip title="Connect a new social media account">
            <Button
              variant="contained"
              color="primary"
              startIcon={<Icon>add_link</Icon>}
              onClick={() => setConnectDialogOpen(true)}
              sx={{ whiteSpace: 'nowrap', minWidth: 'fit-content' }}
            >
              Connect Account
            </Button>
          </Tooltip>
        </Box>

        <QuickFilters
          filters={quickFilters}
          onFilterChange={handleQuickFilterChange}
          variant="buttons"
          multiSelect={false}
        />
      </Toolbar>

      {ConnectAccountDialog && (
        <ConnectAccountDialog
          reactory={reactory}
          open={connectDialogOpen}
          onComplete={handleConnectComplete}
          onCancel={() => setConnectDialogOpen(false)}
        />
      )}
    </>
  );
};

const Definition: any = {
  name: 'SocialAccountsToolbar',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: SocialAccountsToolbar,
  roles: ['USER']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SocialAccountsToolbar,
    ['SocialEyes', 'Toolbar'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: SocialAccountsToolbar
  });
}

export default SocialAccountsToolbar;
