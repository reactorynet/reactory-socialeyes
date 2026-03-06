import Reactory from '@reactorynet/reactory-core';

const ListUIOptions: Reactory.Client.Components.IMaterialListWidgetOptions = {
  primaryText: '${item.name}',
  secondaryText: '${item.provider} - ${item.providerAccountId}',
  showAvatar: true,
  avatarField: 'avatar',
  showTitle: true,
  showLabel: false,
  allowAdd: false,
  remoteData: true,
  query: 'listAccounts',
  options: {},
  resultMap: {
    '[]': 'data'
  },
  variables: {
    'search': 'filter.search',
  },
  title: 'Social Accounts',
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

const ticketsListUISchema: Reactory.Schema.IUISchema = {
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
      accounts: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ],
};

export const ListUiSchema: Reactory.Schema.IUISchema = {
  ...BaseUISchema,
  accounts: ticketsListUISchema,
};

const MaterialTableUIOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
  showLabel: false,
  allowAdd: false,
  allowDelete: false,
  search: false,
  columns: [
    {
      title: 'Platform',
      field: 'provider',
      width: 120,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.provider': 'value'
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
      title: 'Account',
      field: 'name',
      width: 200,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.name}',
            style: {
              fontWeight: 600,
            }
          }
        }
      }
    },
    {
      title: 'Status',
      field: 'isActive',
      width: 130,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.isActive': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'filled',
            size: 'small',
            colorMap: {
              'true': '#4caf50',
              'false': '#757575',
            },
            iconMap: {
              'true': 'check_circle',
              'false': 'cancel',
            },
            labelMap: {
              'true': 'Active',
              'false': 'Inactive',
            }
          }
        }
      }
    },
    {
      title: 'Scopes',
      field: 'scopes',
      width: 200,
      component: 'ChipArrayWidget',
      propsMap: {
        'rowData.scopes': 'formData'
      },
      props: {
        uiSchema: {
          'ui:options': {
            maxDisplay: 3,
            size: 'small',
            variant: 'outlined',
          }
        }
      }
    },
    {
      title: 'Connected',
      field: 'createdAt',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.createdAt': 'date'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
          }
        }
      },
      type: 'datetime',
      defaultSort: 'desc'
    },
    {
      title: 'Updated',
      field: 'updatedAt',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.updatedAt': 'date'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
          }
        }
      },
      type: 'datetime'
    },
  ],
  remoteData: true,
  query: 'listAccounts',
  altRowStyle: {
    backgroundColor: '#fafafa'
  },
  selectedRowStyle: {
    backgroundColor: '#e3f2fd'
  },
  conditionalRowStyling: [
    {
      field: 'isActive',
      condition: 'false',
      style: {
        opacity: 0.6,
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
    pageSizeOptions: [10, 25, 50],
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
      key: 'refresh',
      icon: 'sync',
      title: 'Refresh Token',
      event: {
        name: 'refreshAccount',
        via: 'component',
        component: 'socialeyes.AccountWorkflow@1.0.0',
        paramsMap: {
          'rowData': 'account'
        }
      }
    },
    {
      key: 'disconnect',
      icon: 'link_off',
      title: 'Disconnect',
      confirmation: {
        key: 'confirm',
        acceptTitle: 'DISCONNECT',
        cancelTitle: 'CANCEL',
        content: 'Are you sure you want to disconnect the ${rowData.provider} account "${rowData.name}"? This will stop all listeners associated with this account.',
        title: 'Disconnect ${rowData.name}?',
      },
      event: {
        name: 'disconnectAccount',
        via: 'component',
        component: 'socialeyes.AccountWorkflow@1.0.0',
        paramsMap: {
          'rowData': 'account'
        }
      }
    }
  ],
  componentMap: {
    DetailsPanel: 'socialeyes.AccountDetailPanel@1.0.0',
    Toolbar: 'socialeyes.SocialAccountsToolbar@1.0.0',
  },
  detailPanelProps: {
    useCase: 'grid'
  },
  detailPanelPropsMap: {
    'props.rowData': 'account',
  },
  resultMap: {
    '[]': 'data'
  },
  variables: {
    'query.search': 'filter.search',
  }
};

export const GridUISchema: Reactory.Schema.IFormUISchema = {
  ...BaseUISchema,
  accounts: {
    'ui:title': null,
    'ui:widget': 'MaterialTableWidget',
    'ui:options': MaterialTableUIOptions
  }
};
