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

interface SocialMessagesToolbarDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  QuickFilters: any;
  SearchBar: any;
}

interface SocialMessagesToolbarProps {
  reactory: Reactory.Client.IReactoryApi;
  data: {
    data?: any[];
    paging?: any;
    selected?: any[] | null;
  };
  onDataChange?: (filteredData: any[]) => void;
  searchText?: string;
  onSearchChange?: (text: string) => void;
}

const SocialMessagesToolbar = (props: SocialMessagesToolbarProps) => {
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
  } = reactory.getComponents<SocialMessagesToolbarDependencies>([
    'react.React',
    'material-ui.Material',
    'core.QuickFilters',
    'core.SearchBar',
  ]);

  const { MaterialCore } = Material;
  const { Box, Button, Icon, Toolbar, Tooltip, Divider } = MaterialCore;

  if (!QuickFilters || !SearchBar) {
    return (
      <Toolbar sx={{ p: 2 }}>
        <Box>Loading filters...</Box>
      </Toolbar>
    );
  }

  const [originalData] = React.useState(data);
  const [syncing, setSyncing] = React.useState(false);

  const counts = React.useMemo(() => {
    return {
      unread: data?.data?.filter((m: any) => !m.readAt && m.isIncoming).length || 0,
      incoming: data?.data?.filter((m: any) => m.isIncoming).length || 0,
      outgoing: data?.data?.filter((m: any) => !m.isIncoming).length || 0,
      x: data?.data?.filter((m: any) => m.platform === 'x').length || 0,
      reddit: data?.data?.filter((m: any) => m.platform === 'reddit').length || 0,
    };
  }, [data]);

  const quickFilters: QuickFilterDefinition[] = [
    {
      id: 'unread',
      label: 'Unread',
      icon: 'mark_email_unread',
      color: 'warning',
      filter: { field: 'readAt', value: null, operator: 'is-null' },
      badge: counts.unread,
    },
    {
      id: 'incoming',
      label: 'Incoming',
      icon: 'call_received',
      color: 'primary',
      filter: { field: 'isIncoming', value: true, operator: 'eq' },
      badge: counts.incoming,
    },
    {
      id: 'outgoing',
      label: 'Outgoing',
      icon: 'call_made',
      color: 'default',
      filter: { field: 'isIncoming', value: false, operator: 'eq' },
      badge: counts.outgoing,
    },
    {
      id: 'x-messages',
      label: 'X Messages',
      icon: 'tag',
      color: 'info',
      filter: { field: 'platform', value: 'x', operator: 'eq' },
      badge: counts.x,
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
    const filtered = originalData?.data?.filter((msg: any) => {
      return (
        msg.content?.toLowerCase().includes(searchLower) ||
        msg.from?.username?.toLowerCase().includes(searchLower) ||
        msg.from?.name?.toLowerCase().includes(searchLower)
      );
    });

    onDataChange(filtered);
  }, [originalData, onDataChange, onSearchChange]);

  const handleQuickFilterChange = React.useCallback((activeFilters: string[]) => {
    if (activeFilters.length === 0) {
      onDataChange(originalData);
      return;
    }

    const filtered = originalData?.data?.filter((item: any) => {
      return activeFilters.some(filterId => {
        switch (filterId) {
          case 'unread':
            return !item.readAt && item.isIncoming;
          case 'incoming':
            return item.isIncoming;
          case 'outgoing':
            return !item.isIncoming;
          case 'x-messages':
            return item.platform === 'x';
          default:
            return false;
        }
      });
    });

    onDataChange(filtered);
  }, [originalData, onDataChange]);

  const handleSyncInbox = React.useCallback(async () => {
    setSyncing(true);
    try {
      await reactory.graphqlMutation(
        `mutation SocialEyesSyncAllInboxes {
          socialEyesAccounts(filter: { isActive: true }) {
            id
          }
        }`,
        {}
      );
      reactory.createNotification('Inbox sync complete', { showInAppNotification: true, type: 'success' });
    } catch (err) {
      reactory.createNotification('Failed to sync inbox', { showInAppNotification: true, type: 'error' });
    } finally {
      setSyncing(false);
    }
  }, [reactory]);

  return (
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
          placeholder="Search messages by content or sender..."
          onSearch={handleSearch}
          initialValue={searchText}
          debounceDelay={300}
          showHelpTooltip
          helpText="Search in message content, sender username, and name"
          fullWidth
        />
        <Tooltip title="Sync Inbox">
          <Button
            variant="outlined"
            startIcon={<Icon>{syncing ? 'hourglass_empty' : 'sync'}</Icon>}
            onClick={handleSyncInbox}
            disabled={syncing}
            sx={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
          >
            Sync
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
  );
};

const Definition: any = {
  name: 'SocialMessagesToolbar',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: SocialMessagesToolbar,
  roles: ['USER']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SocialMessagesToolbar,
    ['SocialEyes', 'Toolbar'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: SocialMessagesToolbar
  });
}

export default SocialMessagesToolbar;
