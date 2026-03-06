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

interface SocialFeedToolbarDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  QuickFilters: any;
  SearchBar: any;
}

interface SocialFeedToolbarProps {
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

const SocialFeedToolbar = (props: SocialFeedToolbarProps) => {
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
  } = reactory.getComponents<SocialFeedToolbarDependencies>([
    'react.React',
    'material-ui.Material',
    'core.QuickFilters',
    'core.SearchBar',
  ]);

  const { MaterialCore } = Material;
  const { Box, Toolbar } = MaterialCore;

  if (!QuickFilters || !SearchBar) {
    return (
      <Toolbar sx={{ p: 2 }}>
        <Box>Loading filters...</Box>
      </Toolbar>
    );
  }

  const [originalData] = React.useState(data);

  const counts = React.useMemo(() => {
    return {
      x: data?.data?.filter((p: any) => p.platform === 'x').length || 0,
      reddit: data?.data?.filter((p: any) => p.platform === 'reddit').length || 0,
      positive: data?.data?.filter((p: any) => p.sentiment > 0.2).length || 0,
      negative: data?.data?.filter((p: any) => p.sentiment < -0.2).length || 0,
      trending: data?.data?.filter((p: any) => {
        const m = p.metrics;
        return m && (m.likes + m.shares + m.comments) > 100;
      }).length || 0,
    };
  }, [data]);

  const quickFilters: QuickFilterDefinition[] = [
    {
      id: 'x-posts',
      label: 'X Posts',
      icon: 'tag',
      color: 'primary',
      filter: { field: 'platform', value: 'x', operator: 'eq' },
      badge: counts.x,
    },
    {
      id: 'reddit-posts',
      label: 'Reddit Posts',
      icon: 'forum',
      color: 'warning',
      filter: { field: 'platform', value: 'reddit', operator: 'eq' },
      badge: counts.reddit,
    },
    {
      id: 'positive',
      label: 'Positive',
      icon: 'sentiment_satisfied',
      color: 'success',
      filter: { field: 'sentiment', value: 0.2, operator: 'eq' },
      badge: counts.positive,
    },
    {
      id: 'negative',
      label: 'Negative',
      icon: 'sentiment_dissatisfied',
      color: 'error',
      filter: { field: 'sentiment', value: -0.2, operator: 'eq' },
      badge: counts.negative,
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
    const filtered = originalData?.data?.filter((post: any) => {
      return (
        post.content?.toLowerCase().includes(searchLower) ||
        post.author?.username?.toLowerCase().includes(searchLower) ||
        post.author?.name?.toLowerCase().includes(searchLower) ||
        post.hashtags?.some((h: string) => h.toLowerCase().includes(searchLower))
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
          case 'x-posts':
            return item.platform === 'x';
          case 'reddit-posts':
            return item.platform === 'reddit';
          case 'positive':
            return item.sentiment > 0.2;
          case 'negative':
            return item.sentiment < -0.2;
          default:
            return false;
        }
      });
    });

    onDataChange(filtered);
  }, [originalData, onDataChange]);

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
          placeholder="Search posts by content, author, or hashtag..."
          onSearch={handleSearch}
          initialValue={searchText}
          debounceDelay={300}
          showHelpTooltip
          helpText="Search in post content, author name, username, and hashtags"
          fullWidth
        />
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
  name: 'SocialFeedToolbar',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: SocialFeedToolbar,
  roles: ['USER']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SocialFeedToolbar,
    ['SocialEyes', 'Toolbar'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: SocialFeedToolbar
  });
}

export default SocialFeedToolbar;
