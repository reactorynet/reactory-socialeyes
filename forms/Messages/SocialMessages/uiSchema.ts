import Reactory from '@reactorynet/reactory-core';

const ListUIOptions: Reactory.Client.Components.IMaterialListWidgetOptions = {
  primaryText: '${item.from.username}',
  secondaryText: '${item.content}',
  showAvatar: false,
  showTitle: true,
  showLabel: false,
  allowAdd: false,
  remoteData: true,
  query: 'inbox',
  options: {},
  resultMap: {
    'paging.page': 'paging.page',
    'paging.total': 'paging.totalCount',
    'paging.pageSize': 'paging.pageSize',
    'messages': 'data'
  },
  variables: {
    'paging.page': 'paging.page',
    'paging.pageSize': 'paging.pageSize',
  },
  title: 'Social Messages',
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
      messages: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],
};

export const ListUiSchema: Reactory.Schema.IUISchema = {
  ...BaseUISchema,
  messages: listUISchema,
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
      title: 'Direction',
      field: 'isIncoming',
      width: 100,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.isIncoming': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'outlined',
            size: 'small',
            colorMap: {
              'true': '#1976d2',
              'false': '#757575',
            },
            iconMap: {
              'true': 'call_received',
              'false': 'call_made',
            },
            labelMap: {
              'true': 'Incoming',
              'false': 'Outgoing',
            }
          }
        }
      }
    },
    {
      title: 'From',
      field: 'from',
      width: 180,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '@${rowData.from.username}',
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
            truncate: 80,
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
      title: 'Read',
      field: 'readAt',
      width: 100,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.readAt': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'filled',
            size: 'small',
            valueFormatter: (value: any) => value ? 'Read' : 'Unread',
            colorFormatter: (value: any) => value ? '#4caf50' : '#ff9800',
            iconFormatter: (value: any) => value ? 'mark_email_read' : 'mark_email_unread',
          }
        }
      }
    },
    {
      title: 'Sent',
      field: 'sentAt',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.sentAt': 'date'
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
  query: 'inbox',
  altRowStyle: {
    backgroundColor: '#fafafa'
  },
  selectedRowStyle: {
    backgroundColor: '#e3f2fd'
  },
  conditionalRowStyling: [
    {
      field: 'readAt',
      condition: null,
      style: {
        backgroundColor: '#e3f2fd',
        borderLeft: '4px solid #1976d2',
        fontWeight: 600,
      }
    }
  ],
  options: {
    selection: false,
    search: true,
    searchFieldAlignment: 'left',
    grouping: false,
    filtering: false,
    exportButton: false,
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
  actions: [
    {
      key: 'markRead',
      icon: 'mark_email_read',
      title: 'Mark as Read',
      event: {
        name: 'markRead',
        via: 'graphql',
        mutation: 'markRead',
        paramsMap: {
          'rowData.id': 'id'
        }
      }
    },
  ],
  componentMap: {
    DetailsPanel: 'socialeyes.MessageDetailPanel@1.0.0',
    Toolbar: 'socialeyes.SocialMessagesToolbar@1.0.0',
  },
  detailPanelProps: {
    useCase: 'grid'
  },
  detailPanelPropsMap: {
    'props.rowData': 'message',
  },
  resultMap: {
    'paging.page': 'paging.page',
    'paging.total': 'paging.total',
    'paging.pageSize': 'paging.pageSize',
    'messages': 'data'
  },
  variables: {
    'query.search': 'filter.search',
    'query.page': 'paging.page',
    'query.pageSize': 'paging.pageSize',
  }
};

export const GridUISchema: Reactory.Schema.IFormUISchema = {
  ...BaseUISchema,
  messages: {
    'ui:title': null,
    'ui:widget': 'MaterialTableWidget',
    'ui:options': MaterialTableUIOptions
  }
};
