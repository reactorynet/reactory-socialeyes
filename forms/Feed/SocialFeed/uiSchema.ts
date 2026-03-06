import Reactory from '@reactorynet/reactory-core';

const ListUIOptions: Reactory.Client.Components.IMaterialListWidgetOptions = {
  primaryText: '@${item.author.username}',
  secondaryText: '${item.content}',
  showAvatar: true,
  avatarField: 'author.avatar',
  showTitle: true,
  showLabel: false,
  allowAdd: false,
  remoteData: true,
  query: 'feedPosts',
  options: {},
  resultMap: {
    'paging.page': 'paging.page',
    'paging.total': 'paging.totalCount',
    'paging.pageSize': 'paging.pageSize',
    'posts': 'data'
  },
  variables: {
    'search': 'filter.search',
    'paging.page': 'paging.page',
    'paging.pageSize': 'paging.pageSize',
  },
  title: 'Social Feed',
  titleClass: 'title',
  jss: {
    root: {
      display: 'flex',
      flexDirection: 'column',
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      textAlign: 'center',
    },
    list: {
      minWidth: '70%',
      margin: 'auto',
      maxHeight: '80%',
      minHeight: '80%',
    }
  }
};

const listUISchema: Reactory.Schema.IUISchema = {
  'ui:widget': 'MaterialListWidget',
  'ui:title': null,
  'ui:options': ListUIOptions as Reactory.Schema.IUISchemaOptions,
};

const BaseUISchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    componentType: 'div',
    showSubmit: false,
    showRefresh: false,
    toolbarPosition: 'top',
    toolbarStyle: {
      display: 'flex',
      justifyContent: 'flex-end'
    },
    showSchemaSelectorInToolbar: true,
    schemaSelector: {
      variant: 'icon-button',
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      posts: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],
};

export const ListUiSchema: Reactory.Schema.IUISchema = {
  ...BaseUISchema,
  posts: listUISchema,
};

const MaterialTableUIOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
  showLabel: false,
  allowAdd: false,
  allowDelete: false,
  search: false,
  columns: [
    {
      title: 'Platform',
      field: 'platform',
      width: 100,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.platform': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'filled',
            size: 'small',
            colorMap: {
              'x': '#000000',
              'reddit': '#FF4500',
            },
            iconMap: {
              'x': 'tag',
              'reddit': 'forum',
            },
            labelFormat: '${value.toUpperCase()}'
          }
        }
      }
    },
    {
      title: 'Author',
      field: 'author',
      width: 180,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '@${rowData.author.username}',
            style: {
              fontWeight: 500,
              color: '#1976d2',
            }
          }
        }
      }
    },
    {
      title: 'Content',
      field: 'content',
      width: 350,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.content}',
            truncate: 100,
            style: {
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '350px',
            }
          }
        }
      }
    },
    {
      title: 'Sentiment',
      field: 'sentiment',
      width: 130,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.sentiment': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'filled',
            size: 'small',
            valueFormatter: (value: number) => {
              if (value === null || value === undefined) return 'N/A';
              if (value > 0.2) return 'Positive';
              if (value < -0.2) return 'Negative';
              return 'Neutral';
            },
            colorFormatter: (value: number) => {
              if (value === null || value === undefined) return '#9e9e9e';
              if (value > 0.2) return '#4caf50';
              if (value < -0.2) return '#f44336';
              return '#757575';
            },
            iconFormatter: (value: number) => {
              if (value === null || value === undefined) return 'help';
              if (value > 0.2) return 'sentiment_satisfied';
              if (value < -0.2) return 'sentiment_dissatisfied';
              return 'sentiment_neutral';
            },
          }
        }
      }
    },
    {
      title: 'Likes',
      field: 'metrics.likes',
      width: 80,
      align: 'center',
      component: 'CountBadgeWidget',
      propsMap: {
        'rowData.metrics.likes': 'formData'
      },
      props: {
        uiSchema: {
          'ui:options': {
            icon: 'favorite',
            showZero: true,
            color: 'error',
          }
        }
      }
    },
    {
      title: 'Shares',
      field: 'metrics.shares',
      width: 80,
      align: 'center',
      component: 'CountBadgeWidget',
      propsMap: {
        'rowData.metrics.shares': 'formData'
      },
      props: {
        uiSchema: {
          'ui:options': {
            icon: 'share',
            showZero: true,
            color: 'primary',
          }
        }
      }
    },
    {
      title: 'Comments',
      field: 'metrics.comments',
      width: 80,
      align: 'center',
      component: 'CountBadgeWidget',
      propsMap: {
        'rowData.metrics.comments': 'formData'
      },
      props: {
        uiSchema: {
          'ui:options': {
            icon: 'comment',
            showZero: true,
            color: 'info',
          }
        }
      }
    },
    {
      title: 'Published',
      field: 'publishedAt',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.publishedAt': 'date'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
            autoRefresh: true,
            refreshInterval: 60000
          }
        }
      },
      type: 'datetime',
      defaultSort: 'desc'
    },
  ],
  remoteData: true,
  query: 'feedPosts',
  altRowStyle: {
    backgroundColor: '#fafafa'
  },
  selectedRowStyle: {
    backgroundColor: '#e3f2fd'
  },
  options: {
    selection: false,
    search: true,
    searchFieldAlignment: 'left',
    grouping: true,
    filtering: false,
    exportButton: true,
    exportAllData: true,
    columnsButton: true,
    pageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    emptyRowsWhenPaging: false,
    debounceInterval: 500,
    thirdSortClick: false,
    padding: 'default',
    detailPanelType: 'single',
    showDetailPanelIcon: true,
    detailPanelColumnAlignment: 'left',
  },
  headerStyle: {
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  componentMap: {
    DetailsPanel: 'socialeyes.FeedDetailPanel@1.0.0',
    Toolbar: 'socialeyes.SocialFeedToolbar@1.0.0',
  },
  detailPanelProps: {
    useCase: 'grid'
  },
  detailPanelPropsMap: {
    'props.rowData': 'post',
  },
  resultMap: {
    'paging.page': 'paging.page',
    'paging.total': 'paging.total',
    'paging.pageSize': 'paging.pageSize',
    'posts': 'data'
  },
  variables: {
    'query.search': 'filter.search',
    'query.page': 'paging.page',
    'query.pageSize': 'paging.pageSize',
  }
};

export const GridUISchema: Reactory.Schema.IFormUISchema = {
  ...BaseUISchema,
  posts: {
    'ui:title': null,
    'ui:widget': 'MaterialTableWidget',
    'ui:options': MaterialTableUIOptions
  }
};
